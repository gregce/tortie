#!/usr/bin/env node
/**
 * `npm run conformance:containment`, the gate on the one door every fs
 * mutation goes through (Phase 273).
 *
 * About 5 s. It launches no Electron, opens no window, starts no tmux server,
 * spawns no agent, makes no request, reads nothing under the person's home,
 * and writes nothing outside a `mkdtemp` fixture and a set of ablation copies,
 * both removed in a `finally`.
 *
 * ## Why it exists
 *
 * Issue 25, belucid, 2026-09-15, on 0.106.0: a person who could not save any
 * file, ever, and was told each time that the project was not open. The cause
 * was two spellings of one folder. `addProject` stores `path.resolve(…)` and
 * never `realpath` (sessions/core.ts:2891), so a project opened through a
 * symlink is remembered through it and the tree builds each tab's path by
 * concatenating onto that spelling; `resolveProjectRoot` realpaths the root;
 * and `resolveInsideRoot` compared the two LEXICALLY and threw before its own
 * real guard — which resolves the parent and re-checks containment, and which
 * admits the alias — could answer.
 *
 * Phase 273 lets an ABSOLUTE input that fails the lexical test be PLACED by the
 * disk instead — one question about an ANCESTOR — and then resolved by the same
 * walk a relative path has always taken. That is a relaxation of the gate every
 * fs mutation asks, and a relaxation of a containment gate is exactly the kind
 * of thing that is right on the day and wrong two rounds later. So the phase's
 * escape checklist is this gate: every shape that must still be refused is
 * DRIVEN through the shipping guard, not read, and every row that moves is
 * driven too.
 *
 * ## The rules
 *
 *  1. THE MATRIX. Every row of the checklist, driven through the shipping
 *     `resolveInsideRoot`, `resolveProjectRoot` and `resolveOpenProjectRoot`
 *     over a fixture holding the alias, eight symlinks, a prefix-sibling
 *     decoy, a `.git` tree, a dangling link, a loop, a mode-000 directory and
 *     a real file whose name begins with two dots. The reading is the WORD the
 *     guard stamped, so the checklist and the refusal vocabulary are one table.
 *  2. ONE STAMPING FACTORY. `gmuxError(` is named once in the module and the
 *     once is inside `refuse`, and every `throw` in the module goes through
 *     `refuse`, `refuseOutside` or `refuseProtected`. A word that a throw site
 *     can forget is not a word the caller can trust.
 *  3. THE PLACING STEP IS BOUNDED. Inside the arm that runs when the string
 *     comparison fails: the input must be absolute, the containment question is
 *     asked by `hasAncestorInsideRoot` and asked AFTER the absolute test so a
 *     relative path costs no syscall, the block resolves nothing itself and
 *     walks no ancestors, it reads no errno, and its only answer is the
 *     containment refusal — it never returns a value.
 *  4. THE PLACER IS THE ANTI-ORACLE. `hasAncestorInsideRoot` climbs by
 *     `dirname` to the first ancestor that resolves and compares THAT to the
 *     real root. It answers rather than refuses, never reads an errno, and
 *     terminates at '/'. This is what stops `unreadable` saying anything about
 *     the disk OUTSIDE the project: a stranger and an unreadable stranger get
 *     one word.
 *  5. ONE RESOLUTION RULE, AND THE LEAF IS NEVER RESOLVED. `resolveInsideRoot`
 *     calls `realpath` zero times of its own and names `realpathOfAncestors`
 *     exactly once, so both spellings take the same walk; the walk's answer is
 *     compared to the root; and `abs` is composed from the resolved parent. The
 *     module's SYMLINK RULE is a promise about renaming and trashing a link,
 *     and this phase must not narrow it by accident.
 *  6. THE ROOT-WALK COMMENT SAYS WHAT IS TRUE. Its old text justified an
 *     unreachable throw with a premise the lexical check established, and a
 *     comment whose only stated reason is a premise a later round can lift is
 *     a comment that invites the lift. The new one names both reasons and the
 *     old sentence is gone.
 *  7. THE SEAM. The module exports the closed word set and one structural
 *     reader and nothing else of the mechanism, and it names no save word — so
 *     it stays ignorant of what a save SAYS, which is what lets the two halves
 *     of this phase be built at once.
 *  8. A gate nothing names is how a gate decays.
 *  9. THE ABLATIONS. One clause each, and each one DECLARES THE ROWS IT OWNS.
 *     A rule that cannot fail proves nothing, and an ablation that moves some
 *     other row than the one it is for proves something else.
 *
 * ## The two rows whose reading depends on the machine, declared rather than hidden
 *
 *  - THE CASE VARIANT is accepted on a case-insensitive volume and refused on
 *    a case-sensitive one. The probe reports which volume it ran on and this
 *    gate expects accordingly. It is not an escape either way: on that volume
 *    it names the same file, the ancestors come back canonical from `realpath`
 *    and only the LEAF keeps the caller's case — which is already true today
 *    for a relative input, where 'src/INDEX.TS' is accepted with that spelling.
 *  - THE UNREADABLE ANCESTOR INSIDE THE ROOT needs a directory the process
 *    cannot traverse, and uid 0 traverses everything. Under root the probe
 *    answers SKIPPED-ROOT and this gate says so rather than failing. The
 *    ablation that owns the `unreadable` stamp is carried by the symlink loop
 *    instead, which reads the same whoever runs it.
 *
 * `P273_ABLATION_DETAIL=1` prints which reading each ablation moved.
 */

import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockAt, functionBodyOf, stripComments } from './scan-source.mjs';
import { tsxCli } from './ts-runner.mjs';

const TAG = '[conformance:containment]';
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const fail = (message) => failures.push(`${TAG} ${message}`);
const say = (line) => console.log(`${TAG} ${line}`);

const DOMAIN = join(repoRoot, 'src/main/fs');
const MODULE = 'paths.ts';
const SOURCE_REL = 'src/main/fs/paths.ts';

const raw = readFileSync(join(DOMAIN, MODULE), 'utf8');
const code = stripComments(raw);

// ---------------------------------------------------------------------------
// The probe.
// ---------------------------------------------------------------------------

function runProbe(modules) {
  const probe = spawnSync(
    process.execPath,
    [tsxCli(), '--tsconfig', 'tsconfig.node.json', 'build/containment-conformance-probe.mts'],
    {
      encoding: 'utf8',
      cwd: repoRoot,
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        ...(modules === null ? {} : { P273_MODULES: modules })
      }
    }
  );
  if (probe.status !== 0) {
    return {
      error: `the probe did not run: ${(probe.stderr || '').slice(-800) || '(no output)'}`
    };
  }
  const line = probe.stdout.trim().split('\n').pop() ?? '';
  try {
    return JSON.parse(line);
  } catch {
    return { error: `the probe printed no JSON: ${probe.stdout.slice(0, 400)}` };
  }
}

const live = runProbe(null);
if (live.error !== undefined) {
  process.stderr.write(`${TAG} ${live.error}\n`);
  process.stderr.write(`${TAG} FAILED: the shipping guard could not be driven.\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Rule 1. The matrix — the phase's escape checklist, driven.
//
// `caseVariant` and `unreadableInside` are the two machine-dependent readings,
// and both are computed from what the probe reported about the machine rather
// than assumed. `unreadableInside` is read by TWO rows on purpose — 14 by the
// real spelling and 29 through the alias — because the fix round's whole claim
// is that those two answer the same word.
// ---------------------------------------------------------------------------

const caseVariant = live.caseInsensitive === true ? 'OK:src/index.ts' : 'OUTSIDE';
const unreadableInside = live.isRoot === true ? 'SKIPPED-ROOT' : 'UNREADABLE';

/** Each row the probe drives, the reading the shipping guard must give, why. */
const MATRIX = [
  // Shapes that must still be refused. Checklist rows 1 to 18.
  ['r01a-relative-traversal', 'OUTSIDE', '1: a relative traversal out of the root'],
  ['r01b-relative-traversal-mid', 'OUTSIDE', '1: a traversal from inside a real directory'],
  ['r01c-relative-dotdot', 'OUTSIDE', "1: the bare '..'"],
  ['r02a-absolute-stranger', 'OUTSIDE', '2: an absolute path to a stranger'],
  ['r02b-absolute-scratch-stranger', 'OUTSIDE', '2: an absolute path beside the project'],
  ['r03-prefix-sibling', 'OUTSIDE', "3: a sibling that merely shares the root's string prefix"],
  ['r04-dirlink-out-existing', 'OUTSIDE', '4: a directory symlink out of the root, existing leaf'],
  ['r05-dirlink-out-missing', 'OUTSIDE', '5: the same with ancestors that do not exist yet'],
  ['r06-link-to-fs-root', 'OUTSIDE', '6: a symlink to the filesystem root'],
  ['r07-link-to-other-project', 'OUTSIDE', '7: a symlink into ANOTHER open project'],
  ['r08rel-alias-prefix-traversal', 'OUTSIDE', '8: a traversal wearing a symlinked prefix, relative'],
  ['r08abs-alias-prefix-traversal', 'OUTSIDE', '8: the same spelled absolutely through the alias'],
  ['r09-absolute-traversal-through-alias', 'OUTSIDE', '9: an absolute traversal through the alias'],
  ['r10-alias-root-with-allowRoot', 'OUTSIDE', '10: the alias root itself under allowRoot, a declared limit'],
  ['r11a-dotgit', 'PROTECTED', '11: .git at the top'],
  ['r11b-dotgit-nested', 'PROTECTED', '11: .git at depth'],
  ['r11c-dotgit-case', 'PROTECTED', '11: .GIT, case folded'],
  ['r11d-dotgit-through-link', 'PROTECTED', '11: .git reached through a symlink'],
  ['r12-dotgit-through-alias', 'PROTECTED', '12: .git reached through the ALIAS, after the arm admits it'],
  ['r13-absolute-nothing-exists', 'OUTSIDE', "13: an absolute path where nothing on the chain exists"],
  ['r14-unreadable-ancestor-inside', unreadableInside, '14: an ancestor inside the root the process cannot traverse'],
  ['r15-symlink-loop', 'UNREADABLE', '15: a symlink loop with a child, no raw errno'],
  ['r16-unreadable-ancestor-outside', 'OUTSIDE', '16: an unreadable ancestor OUTSIDE the root, indistinguishably'],
  ['r17-nul', 'INPUT', '17: a NUL byte, and it is a malformed request rather than a containment fact'],
  ['r18a-whitespace-only', 'INPUT', '18: a whitespace-only path'],
  ['r18b-space-named-directory', 'OK:src/   /x.txt', '18: a space-named directory mid-path is addressable, and always was'],
  ['rBackin-relative-back-inside', 'OUTSIDE', 'the bound on the arm: a relative traversal onto a symlink that points back INSIDE'],

  // Accepted before, accepted after. Checklist rows 19 to 24.
  ['r19-traversal-landing-back-inside', 'OK:secret.txt', "19: '..' collapses textually and the gate names the file inside"],
  ['r20-leaf-link-to-dotgit', 'OK:gitlink', '20: a symlink whose LEAF is .git, pre-existing'],
  ['r21-leaf-link-out', 'OK:leaf.txt', '21: a leaf symlink pointing out, by design'],
  ['r22-dangling-ancestor', 'OK:dangle/evil.txt', '22: a dangling symlink as an ancestor, pre-existing'],
  ['r24-file-as-ancestor', 'OK:src/index.ts/deep/f.txt', '24: a FILE as an ancestor; the disk call fails afterwards'],

  // The rows this phase moves, and the bound it keeps. Rows 25 to 28.
  ['r25a-two-dot-file-absolute', 'OK:..notes.md', '25: a real top-level file beginning with two dots, absolute'],
  ['r25b-two-dot-file-relative', 'OK:..notes.md', '25: the same, relative'],
  ['r25c-two-dot-file-one-level-down', 'OK:src/..dots.md', '25: one level down, which always worked'],
  ['r26a-alias-readme', 'OK:README.md', "26: belucid's project, spelled through the symlink"],
  ['r26b-alias-nested', 'OK:src/index.ts', '26: the same, nested'],
  ['r26c-alias-new-file-parent-exists', 'OK:src/brand-new.ts', '26: a file that does not exist yet, whose parent does'],
  ['r27-case-variant', caseVariant, '27: the case variant, declared'],
  ['r28-alias-parent-missing', 'OK:gone/README.md', '28: an alias path whose parent does not exist resolves like the real spelling'],
  ['r29-alias-unreadable-ancestor', unreadableInside, '29: an unreadable ancestor INSIDE the root, addressed through the alias'],
  ['r30-alias-symlink-loop', 'UNREADABLE', '30: a symlink loop inside the root, addressed through the alias'],
  ['r31-alias-dangling-ancestor', 'OK:dangle/evil.txt', '31: a dangling ancestor through the alias, as the relative spelling always read it'],
  ['r32-alias-of-alias', 'OK:README.md', '32: a CHAIN of aliases, because the class is a property and not one hop'],
  ['r33rel-link-to-parent', 'OUTSIDE', "33: a link inside the root pointing at the root's PARENT, relative"],
  ['r33abs-link-to-parent', 'OUTSIDE', '33: the same through the alias, which is the shape that would climb back out'],
  ['rControl-real-spelling', 'OK:README.md', 'the control: the real spelling, which always worked'],

  // The root guards and the words they stamp.
  ['sRootAlias', 'OK:real', 'resolveProjectRoot collapses the alias to one spelling'],
  ['sRootMissing', 'UNREADABLE|That project folder does not exist.', 'the missing-root sentence is kept byte for byte'],
  ['sRootRelative', 'INPUT|A project folder must be an absolute path.', 'a relative root is the caller composing wrongly'],
  ['sRootUnreadable', 'UNREADABLE|That project folder could not be read (ELOOP).', 'every other errno says what was measured and carries the code'],
  ['sProjectClosed', 'PROJECTCLOSED', 'a root that matches no open project is its own word']
];

/** The readings as an array in MATRIX order, for the ablation comparison. */
function verdict(result) {
  if (result.error !== undefined) return ['error'];
  return MATRIX.map(([key]) => result.rows?.[key] ?? '(no reading)');
}

{
  const got = verdict(live);
  const wrong = MATRIX.map(([key, want, why], at) =>
    got[at] === want ? null : `${key}: expected ${want}, read ${got[at]} — ${why}`
  ).filter(Boolean);
  if (wrong.length > 0) {
    for (const line of wrong) fail(`1. ${line}`);
  } else {
    const volume = live.caseInsensitive === true ? 'case-insensitive' : 'case-sensitive';
    say(
      `1. ${String(MATRIX.length)} readings, every one as the checklist says, on a ${volume} volume` +
        (live.isRoot === true ? ' (running as root: row 14 skipped)' : '')
    );
  }
}

// ---------------------------------------------------------------------------
// Rule 2. One stamping factory, and every throw goes through it.
// ---------------------------------------------------------------------------

const THROWERS = new Set(['refuse', 'refuseOutside', 'refuseProtected']);
{
  const calls = code.split('gmuxError(').length - 1;
  const factory = functionBodyOf(code, 'refuse');
  if (factory === null) {
    fail(`2. ${SOURCE_REL} declares no function called refuse, so this rule read nothing`);
  } else if (calls !== 1) {
    fail(`2. gmuxError( is called ${String(calls)} times in ${SOURCE_REL}; the stamping factory must be the only caller`);
  } else if (!factory.includes('gmuxError(')) {
    fail('2. the one gmuxError( call in the module is not inside refuse, so a throw site can build an unstamped error');
  } else {
    const thrown = [...code.matchAll(/\bthrow\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]);
    const bare = [...code.matchAll(/\bthrow\s+(?![A-Za-z_$][\w$]*\s*\()/g)];
    const strays = [...new Set(thrown.filter((name) => !THROWERS.has(name)))];
    if (strays.length > 0) {
      fail(`2. ${SOURCE_REL} throws through ${strays.join(', ')}, which does not stamp a word`);
    } else if (bare.length > 0) {
      fail(`2. ${SOURCE_REL} has ${String(bare.length)} throw(s) of a value rather than a call, so the word is not stamped`);
    } else {
      say(`2. gmuxError( is called once and it is inside refuse; all ${String(thrown.length)} throws go through the three stamping helpers`);
    }
  }
}

// ---------------------------------------------------------------------------
// Rules 3 to 5. PLACING AND RESOLVING ARE TWO STEPS AND THE ORDER IS THE RULE.
//
// Read by matching braces rather than by searching the file for a word: a
// `realpath` somewhere else in the module would answer a file-wide question and
// say nothing about this one.
//
// Rule 3 reads the PLACING step — the block that decides whether a path that
// failed the string comparison may be looked at by the disk at all. Rule 4
// reads the function that answers it, because that function is where the
// anti-oracle property lives. Rule 5 reads the RESOLVING step and pins that
// `resolveInsideRoot` itself never calls realpath, so there is exactly one
// resolution rule and both spellings take it.
// ---------------------------------------------------------------------------

const insideBody = functionBodyOf(code, 'resolveInsideRoot');
const ARM_HEAD = 'if (!lexicallyInside) {';
let arm = null;
if (insideBody === null) {
  fail(`3. ${SOURCE_REL} declares no resolveInsideRoot, so rules 3 to 5 read nothing`);
} else if (!insideBody.includes('const lexicallyInside = containedIn(realRoot, lexical);')) {
  fail('3. resolveInsideRoot no longer computes lexicallyInside from containedIn, so the placing step reads nothing');
} else {
  const at = insideBody.indexOf(ARM_HEAD);
  if (at === -1) {
    fail(`3. resolveInsideRoot no longer asks \`${ARM_HEAD}\`, so the placing step this rule hangs off is gone`);
  } else {
    arm = blockAt(insideBody, insideBody.indexOf('{', at + ARM_HEAD.length - 1));
    if (arm === null) fail('3. the placing block in resolveInsideRoot could not be read by its braces');
  }
}

if (arm !== null) {
  const clauses = [
    ['it is absolute-only', arm.includes('if (!isAbsolute(trimmed)) throw refuseOutside(input);'), true],
    ['it asks the containment question', arm.includes('await hasAncestorInsideRoot(realRoot, dirname(lexical))'), true],
    ['it never resolves anything itself', arm.includes('await realpath('), false],
    ['it never walks the ancestors', arm.includes('realpathOfAncestors('), false],
    ['its only answer is the containment refusal', !/\breturn\b/.test(arm), true],
    ['it reads no errno', !/\bcatch\b/.test(arm) && !arm.includes('.code'), true]
  ];
  const broken = clauses.filter(([, got, want]) => got !== want).map(([name]) => name);
  if (broken.length > 0) {
    fail(`3. the placing step is no longer bounded: ${broken.join('; ')}`);
  } else {
    const absoluteAt = arm.indexOf('isAbsolute(trimmed)');
    const placeAt = arm.indexOf('hasAncestorInsideRoot(');
    if (absoluteAt > placeAt) {
      fail('3. the placing step spends a syscall on a relative input before it refuses one');
    } else {
      say('3. the placing step is absolute-only, asks containment before it spends a syscall, resolves nothing itself, reads no errno, and can only refuse');
    }
  }
}

{
  const placer = functionBodyOf(code, 'hasAncestorInsideRoot');
  if (placer === null) {
    fail(`4. ${SOURCE_REL} declares no hasAncestorInsideRoot, so the anti-oracle rule reads nothing`);
  } else {
    const clauses = [
      ['it compares against the real root', placer.includes('containedIn(realRoot, await realpath(current))'), true],
      ['it answers rather than refuses', !/\bthrow\b/.test(placer), true],
      ['it never reads an errno', !placer.includes('.code'), true],
      ['it terminates at the filesystem root', placer.includes('if (parent === current) return false;'), true],
      ['it climbs by dirname', placer.includes('const parent = dirname(current);'), true]
    ];
    const broken = clauses.filter(([, got, want]) => got !== want).map(([name]) => name);
    if (broken.length > 0) {
      fail(`4. hasAncestorInsideRoot is no longer the anti-oracle it is written to be: ${broken.join('; ')}`);
    } else {
      say('4. hasAncestorInsideRoot compares against the real root, never throws, never reads an errno, and terminates at /');
    }
  }
}

if (insideBody !== null) {
  const walk = 'const realParent = await realpathOfAncestors(dirname(lexical));';
  const compare = 'if (!containedIn(realRoot, realParent)) throw refuseOutside(input);';
  const leaf = 'const abs = resolve(realParent, basename(lexical));';
  const realpaths = insideBody.split('await realpath(').length - 1;
  const walks = insideBody.split('realpathOfAncestors(').length - 1;
  if (realpaths !== 0) {
    fail(
      `5. resolveInsideRoot holds ${String(realpaths)} realpath call(s) of its own; resolving belongs to the walk ` +
        'and placing to hasAncestorInsideRoot, and a third caller is a second resolution rule'
    );
  } else if (walks !== 1) {
    fail(`5. resolveInsideRoot names realpathOfAncestors ${String(walks)} time(s); one resolution rule means one call`);
  } else if (!insideBody.includes(walk)) {
    fail(`5. resolveInsideRoot does not read \`${walk}\`, so the two spellings no longer take one walk`);
  } else if (!insideBody.includes(compare)) {
    fail(`5. resolveInsideRoot does not compare the walk's answer to the root`);
  } else if (!insideBody.includes(leaf)) {
    fail(`5. resolveInsideRoot no longer composes \`${leaf}\`, so the leaf may be being resolved`);
  } else {
    say('5. resolveInsideRoot calls no realpath of its own, takes the one walk for both spellings, compares its answer, and composes abs from it — the leaf is never resolved');
  }
}

// ---------------------------------------------------------------------------
// Rule 6. The root-walk comment. Read from the UNSTRIPPED source, because a
// comment is what this rule is about.
// ---------------------------------------------------------------------------

{
  const OLD = 'cannot happen for a path already proven to sit under an existing root.';
  const NEW = [
    'TWO things keep this unreachable',
    'Measured: realpath("/") === "/"',
    '/nope-xyz/deep/file.txt',
    // The fix round: the lexical comparison is no longer the only thing that
    // places a path inside the root, and a comment that still says it is has
    // told a later round the wrong premise.
    'hasAncestorInsideRoot'
  ];
  const missing = NEW.filter((s) => !raw.includes(s));
  if (raw.includes(OLD)) {
    fail(
      "6. realpathOfAncestors still justifies its root-walk throw with the premise the lexical check established, " +
        'and that premise is exactly what a later round lifts'
    );
  } else if (missing.length > 0) {
    fail(`6. the root-walk comment does not state ${missing.join(' or ')}, so it gives one reason where there are two`);
  } else {
    say('6. the root-walk comment names both reasons, the second of which survives a later round lifting the first');
  }
}

// ---------------------------------------------------------------------------
// Rule 7. The seam. Half two codes against exactly two names; nothing else
// crosses, and the containment module never learns what a save says.
// ---------------------------------------------------------------------------

{
  const wanted = ['export type FsPathRefusal', 'export function fsPathRefusalOf'];
  const missing = wanted.filter((s) => !code.includes(s));
  const leaked = ['export function refuse(', 'export function refuseOutside(', 'export const STAMP']
    .filter((s) => code.includes(s));
  const saveWords = ['FsGuardedWriteRefusal', 'projectsUnknown', 'did not save'].filter((s) =>
    code.includes(s)
  );
  if (missing.length > 0) {
    fail(`7. ${SOURCE_REL} does not export ${missing.join(' or ')}, which is the whole seam half two codes against`);
  } else if (leaked.length > 0) {
    fail(`7. ${SOURCE_REL} exports ${leaked.join(', ')}; the mechanism does not cross, only the word set and the reader do`);
  } else if (saveWords.length > 0) {
    fail(`7. ${SOURCE_REL} names ${saveWords.join(', ')}, so the containment module has learned what a save says`);
  } else {
    say('7. the module exports the word set and one structural reader, and names no save word');
  }
}

// ---------------------------------------------------------------------------
// Rule 8. A gate nothing names is how a gate decays.
// ---------------------------------------------------------------------------

{
  const pkg = readFileSync(join(repoRoot, 'package.json'), 'utf8');
  if (!pkg.includes('"conformance:containment"')) fail('8. package.json does not name conformance:containment');
  const checks = readFileSync(join(repoRoot, 'build/verification-checks.mjs'), 'utf8');
  if (!checks.includes("'conformance:containment'")) {
    fail('8. build/verification-checks.mjs does not classify conformance:containment');
  }
  const conventions = readFileSync(join(repoRoot, 'CLAUDE.md'), 'utf8');
  if (!conventions.includes('conformance:containment')) {
    fail('8. CLAUDE.md does not name conformance:containment in the path-triggered gate table');
  }
  say('8. the gate is named in package.json, classified in build/verification-checks.mjs and listed in CLAUDE.md');
}

// ---------------------------------------------------------------------------
// Rule 9. The ablations. One clause each, and each one names the rows it owns.
//
// Requiring the OWNED rows to move is what makes these ablations rather than
// edits: an ablation that reddens some other row has proved something, and not
// the thing it was written for.
//
// SOME CLAUSES HAVE NO ABLATION AND THE REASON IS STATED RATHER THAN HIDDEN.
// Containment after the walk is TRIPLY REDUNDANT: the `containedIn(realRoot,
// realParent)` check, the `containedIn(realRoot, abs)` check under it, and the
// `rel === '..' || rel.startsWith('..' + sep)` clause all stand behind each
// other. `abs` is composed from an absolute resolved parent, so a basename
// cannot climb back in, and removing any ONE of the three leaves the other two
// answering `outside` for every shape this fixture holds. The Phase 273 escape
// verifier measured exactly that: four ablations of those checks moved 0 of 100
// rows, against a control ablation that moved 3. `r13-absolute-nothing-exists`
// is owned by that redundancy and therefore by no ablation either. They are
// pinned by rules 3 and 5's text instead. Claiming an ablation for them would
// be claiming a measurement that was never taken.
// ---------------------------------------------------------------------------

const ABLATIONS = [
  {
    name: 'the placing step is not bounded to an absolute input',
    owns: ['rBackin-relative-back-inside'],
    edits: [
      {
        from: '    if (!isAbsolute(trimmed)) throw refuseOutside(input);',
        to: '    if (false) throw refuseOutside(input);'
      }
    ]
  },
  {
    name: 'nothing is ever placed, which is the parent commit',
    owns: [
      'r26a-alias-readme',
      'r26b-alias-nested',
      'r12-dotgit-through-alias',
      'r28-alias-parent-missing',
      'r29-alias-unreadable-ancestor',
      'r30-alias-symlink-loop'
    ],
    edits: [
      {
        from: '    if (!isAbsolute(trimmed)) throw refuseOutside(input);',
        to: '    throw refuseOutside(input);'
      }
    ]
  },
  {
    name: 'the placing step is skipped and the walk speaks for any path at all',
    owns: ['r16-unreadable-ancestor-outside'],
    edits: [
      {
        from: '    if (!(await hasAncestorInsideRoot(realRoot, dirname(lexical)))) {\n      throw refuseOutside(input);\n    }',
        to: '    if (false) {\n      throw refuseOutside(input);\n    }'
      }
    ]
  },
  {
    name: 'the placing step answers on containment of the WHOLE path rather than an ancestor',
    owns: [
      'r28-alias-parent-missing',
      'r29-alias-unreadable-ancestor',
      'r30-alias-symlink-loop',
      'r31-alias-dangling-ancestor'
    ],
    edits: [
      {
        from: '      return containedIn(realRoot, await realpath(current));\n    } catch {\n      const parent = dirname(current);\n      if (parent === current) return false;\n      current = parent;\n    }',
        to: '      return containedIn(realRoot, await realpath(current));\n    } catch {\n      return false;\n    }'
      }
    ]
  },
  {
    name: "the '..' clause asks about a prefix again",
    owns: ['r25a-two-dot-file-absolute', 'r25b-two-dot-file-relative'],
    edits: [
      {
        from: "  if (rel.length === 0 || rel === '..' || rel.startsWith(`..${sep}`)) {",
        to: "  if (rel.length === 0 || rel.startsWith('..')) {"
      }
    ]
  },
  {
    name: 'a NUL byte is a containment fact again',
    owns: ['r17-nul'],
    edits: [
      {
        from: "    throw refuse(\n      'input',\n      'INVALID_INPUT',\n      'A path cannot contain a NUL byte.',\n      input\n    );",
        to: '    throw refuseOutside(input);'
      }
    ]
  },
  {
    name: 'the ancestor walk rethrows the raw errno',
    owns: ['r15-symlink-loop'],
    edits: [
      {
        from: "        const token = typeof code === 'string' ? code : 'UNKNOWN';\n        throw refuse(\n          'unreadable',\n          'FS_FAILED',\n          `\"${visibleName(basename(current))}\" could not be read (${token}).`,\n          token\n        );",
        to: '        throw err;'
      }
    ]
  },
  {
    name: "the project root's realpath catch stops reading the errno",
    owns: ['sRootUnreadable'],
    edits: [
      {
        from: "    if (code === 'ENOENT' || code === 'ENOTDIR') {",
        to: '    if (true) {'
      }
    ]
  },
  {
    name: 'the leaf is resolved, against the module\'s own SYMLINK RULE',
    owns: ['r20-leaf-link-to-dotgit', 'r21-leaf-link-out'],
    edits: [
      {
        from: '  const abs = resolve(realParent, basename(lexical));',
        to: '  const composed = resolve(realParent, basename(lexical));\n  const abs = await realpath(composed).catch(() => composed);'
      }
    ]
  },
  {
    name: 'a project that is not open is stamped outside',
    owns: ['sProjectClosed'],
    edits: [{ from: "  throw refuse(\n    'projectClosed',", to: "  throw refuse(\n    'outside'," }]
  }
];

/**
 * THE COPIES LIVE ONE LEVEL UNDER `src/main/`, and the depth is exact. The
 * module imports `../errors` and `@shared/fs-ops`, so a copy anywhere else
 * fails to IMPORT rather than fail the rule it removed, and a probe red for the
 * wrong reason proves nothing. Each copy is a sibling of `fs/`, dotted so no
 * include glob and no test runner picks it up, and removed in the `finally`
 * whatever happened.
 *
 * Only `paths.ts` is copied: it is the whole module graph this probe loads.
 */
const ABLATION_PREFIX = `.p273-ablation-${process.pid.toString(36)}-`;
const mainDir = join(repoRoot, 'src/main');

function sweepAblations() {
  for (const name of readdirSync(mainDir)) {
    if (name.startsWith(ABLATION_PREFIX)) {
      rmSync(join(mainDir, name), { recursive: true, force: true });
    }
  }
}

const moves = [];
let red = 0;
try {
  const was = verdict(live);
  for (const [i, ablation] of ABLATIONS.entries()) {
    const dir = join(mainDir, `${ABLATION_PREFIX}${String(i)}`);
    mkdirSync(dir, { recursive: true });
    cpSync(join(DOMAIN, MODULE), join(dir, MODULE));
    const target = join(dir, MODULE);
    let applied = true;
    for (const edit of ablation.edits) {
      if (!existsSync(target)) {
        fail(`9. there is no ${MODULE} to ablate for "${ablation.name}"`);
        applied = false;
        break;
      }
      const before = readFileSync(target, 'utf8');
      if (!before.includes(edit.from)) {
        fail(`9. the ablation "${ablation.name}" found nothing to edit in ${MODULE}`);
        applied = false;
        break;
      }
      writeFileSync(target, before.replace(edit.from, edit.to));
    }
    if (!applied) continue;
    const got = verdict(runProbe(dir));
    if (got[0] === 'error') {
      // A PROBE THAT CANNOT RUN IS NOT AN ABLATION THAT WENT RED.
      fail(`9. the ablation "${ablation.name}" stopped the probe running instead of moving a reading, so it proves nothing`);
      continue;
    }
    const detail = MATRIX.map(([key], at) => (got[at] !== was[at] ? `${key} -> "${got[at]}"` : null)).filter(Boolean);
    const stuck = ablation.owns.filter((key) => {
      const at = MATRIX.findIndex(([k]) => k === key);
      return at === -1 || got[at] === was[at];
    });
    if (stuck.length > 0) {
      fail(
        `9. the ablation "${ablation.name}" did not move ${stuck.join(', ')}, the row(s) it is written for` +
          (detail.length > 0 ? ` (it moved ${detail.join(', ')} instead)` : ', and it moved nothing at all')
      );
      continue;
    }
    red += 1;
    moves.push(`${ablation.name} -> ${detail.join(', ')}`);
  }
  say(`9. ${String(red)} of ${String(ABLATIONS.length)} ablations went red on the rows they own, one clause each`);
  if (process.env['P273_ABLATION_DETAIL'] === '1') {
    for (const line of moves) say(`   ablation ${line}`);
  }
} finally {
  sweepAblations();
}

// ---------------------------------------------------------------------------

if (failures.length > 0) {
  for (const f of failures) process.stderr.write(`${f}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(failures.length)} finding(s).\n`);
  process.exit(1);
}
say(`OK: ${String(MATRIX.length)} readings, ${String(red)} of ${String(ABLATIONS.length)} ablations red, every rule passed.`);
process.exit(0);
