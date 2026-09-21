#!/usr/bin/env node
/**
 * `npm run ablation:p300`. THE ATTACK ON PHASE 300'S OWN RULES
 * (the Phase 300 entry in docs/BACKLOG.md, build/p300/SPEC.md §7.1).
 *
 * About 4 s. It launches no Electron, starts no tmux server, spawns no agent,
 * mounts nothing, makes no request and spends no token. It starts no process but
 * `node`. **It reads nothing under the person's home**: every clause below is
 * asserted over scratch directories, and every number Phase 300 states about
 * the operator's 11.76 GB store was measured for the entry and is not
 * re-measurable here.
 *
 * ## What this phase landed, and so what this script attacks
 *
 * Phase 300 LANDED THE RESOLVE CACHE ALONE. The reduced counts read it built —
 * codex's split keep-map rule and the flag that skipped the path index — was
 * measured slower on Electron's own engine and taken out, and the flag's
 * re-read cost was the operator's trade and he dropped it (build/p300/SPEC.md
 * §7.2). So the four clauses that attacked those two — the page's read losing
 * the index, the watermark's mark, the `requireAnywhere` on the shared rule, and
 * the head window made to depend on the caller — are gone with them, and this
 * script is the cache's attack and nothing else's.
 *
 * ## Why a second script
 *
 * A rule that cannot be made to fail proves nothing, and a gate whose rules have
 * never been shown to fail is a gate that can quietly stop asking. The cache's
 * rules live in one vitest file and it has no copy of the module to break. So
 * this script breaks the REAL file, runs the check that OWNS that clause, reads
 * whether it went red, and **puts the file back in a `finally`, byte for byte,
 * checked by sha256 after every single ablation and again at the end.**
 *
 * It is the shape `build/p274/ablation.mjs`, `build/p273/ablation-vocabulary.mjs`
 * and `build/p268/ablation.mjs` use, for the same reason.
 *
 * ## The safety, stated because this script edits the working tree
 *
 *   - Every file's original bytes are read ONCE, before anything is written, and
 *     held in memory. The `finally` writes all of them back whatever happened,
 *     including on an uncaught throw and on a signal.
 *   - After every ablation the file is restored and its sha256 compared with the
 *     original. A mismatch stops the run immediately rather than carrying on
 *     over a tree it has already damaged.
 *   - It asks git nothing and compares against nothing but the bytes it read at
 *     the start. A phase build's tree is dirty by definition, so "restore to what
 *     git has" would be the wrong target; the right one is "restore to what was
 *     here when this started", and that is what the map holds.
 *
 * ## The five clauses, and the check that owns each
 *
 *   1  the cache keyed without the home
 *   2  the cache with no TTL
 *   3  the cache covering the direct stat
 *   4  the cache unbounded
 *   5  the negative answer cached for a provider other than claude
 *
 * All five are the cache's, and
 * `src/main/overview/__tests__/p300-resolve-cache.test.ts` owns them, whose own
 * header names the five and which test each belongs to. 1, 2 and 4 break
 * `reader/resolve-cache.ts`; 3 and 5 break the call sites in
 * `reader/resolve.ts`, because a cache that is correct in itself and consulted
 * from the wrong place is the defect a later round writes.
 *
 * ## What a finding means here
 *
 * Three different failures, and they are not the same:
 *
 *   - **the check stayed GREEN** — the rule cannot be made to fail and has
 *     stopped asking;
 *   - **nothing to edit** — the clause moved and its ablation did not move with
 *     it, so this script is asserting over a shape that is gone;
 *   - **the wrong check went red** — the ablation proved something else.
 */

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TAG = '[ablation:p300]';
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const say = (l) => process.stdout.write(`${TAG} ${l}\n`);
const problems = [];
const sha = (text) => createHash('sha256').update(text).digest('hex');

const CACHE = 'src/main/overview/reader/resolve-cache.ts';
const RESOLVE = 'src/main/overview/reader/resolve.ts';

const CACHE_TEST = 'src/main/overview/__tests__/p300-resolve-cache.test.ts';

/** The checks, by the name an ablation names. */
const CHECKS = {
  cache: {
    what: `vitest ${CACHE_TEST}`,
    run: () => vitest([CACHE_TEST])
  }
};

function vitest(files) {
  return spawnSync(
    process.execPath,
    [join('node_modules', 'vitest', 'vitest.mjs'), 'run', '--no-cache', ...files],
    { encoding: 'utf8', cwd: repoRoot, maxBuffer: 64 * 1024 * 1024 }
  );
}

/**
 * ONE ABLATION PER CLAUSE. `check` names the check that MUST go red, and a run
 * that reddens some other check is a finding about the ablation rather than
 * about the rule. There is one check now, so the second half of that sentence
 * is kept for the day a second one comes back.
 */
const ABLATIONS = [
  {
    n: 1,
    check: 'cache',
    name: 'the cache keyed without the home',
    file: CACHE,
    find: 'return `${key.home}${SEP}${key.provider}${SEP}${key.id}`;',
    to: 'return `${key.provider}${SEP}${key.id}`;'
  },
  {
    n: 2,
    check: 'cache',
    name: 'the cache with no TTL, so a remembered answer never expires',
    file: CACHE,
    find:
      '      if (now() - stamp >= ttlMs) {\n' +
      '        at.delete(k);\n' +
      '        return null;\n' +
      '      }\n',
    to: ''
  },
  {
    n: 3,
    check: 'cache',
    name: 'the cache covering the DIRECT stat, so a first turn is not found',
    file: RESOLVE,
    // The cache read moves ABOVE the direct stat. A row whose record has just
    // landed at the direct path — which is where a normal first turn lands — is
    // then answered `no-file` from memory for the whole window.
    find:
      '      if (isFile(direct)) return { state: \'resolved\', provider, file: direct, sessionId: null };',
    to:
      "      const abl = { home, provider, id };\n" +
      "      if (env?.cache?.get(abl) === 'no-file') return { state: 'no-file', provider };\n" +
      '      if (isFile(direct)) return { state: \'resolved\', provider, file: direct, sessionId: null };'
  },
  {
    n: 4,
    check: 'cache',
    name: 'the cache unbounded, which is the defect a later round writes',
    file: CACHE,
    find:
      '      while (at.size > max) {\n' +
      '        const oldest = at.keys().next().value;\n' +
      '        if (oldest === undefined) break;\n' +
      '        at.delete(oldest);\n' +
      '      }\n',
    to: ''
  },
  {
    n: 5,
    check: 'cache',
    name: "the negative answer cached for a provider other than claude",
    file: RESOLVE,
    // codex's fallback walks date shards and its directory holds far fewer
    // entries than claude's 2,776. Widening the cache to it is the shape that
    // turns a cache into a source of wrong answers, and the provider-scope test
    // is what refuses it.
    find: "      return { state: 'no-file', provider };\n    }\n    case 'grok': {",
    to:
      "      env?.cache?.set({ home, provider, id });\n" +
      "      return { state: 'no-file', provider };\n    }\n    case 'grok': {"
  }
];

// ---------------------------------------------------------------------------
// Read every original ONCE, before anything is written
// ---------------------------------------------------------------------------

const targets = [...new Set(ABLATIONS.map((a) => a.file))];
const originals = new Map();
for (const rel of targets) {
  try {
    originals.set(rel, readFileSync(join(repoRoot, rel), 'utf8'));
  } catch (err) {
    process.stderr.write(`${TAG} ${rel} could not be read: ${String(err)}\n`);
    process.exit(2);
  }
}

function restore() {
  for (const [rel, text] of originals) writeFileSync(join(repoRoot, rel), text);
}

// A signal must not leave the tree edited.
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    restore();
    process.stderr.write(`${TAG} ${sig}: the tree was put back.\n`);
    process.exit(130);
  });
}

let red = 0;
let ran = 0;

try {
  // THE CONTROL. Every check must be GREEN before anything is broken, or every
  // reading below is about a tree that was already failing.
  const controls = {};
  for (const [key, c] of Object.entries(CHECKS)) {
    const run = c.run();
    controls[key] = run.status === 0;
    say(`control: ${c.what} is ${run.status === 0 ? 'GREEN' : `RED (exit ${String(run.status)})`}`);
    if (run.status !== 0) {
      problems.push(
        `the control for ${c.what} is RED before any ablation, so every clause it owns means ` +
          'nothing. Its tail:\n' +
          `${`${run.stdout ?? ''}${run.stderr ?? ''}`.split('\n').slice(-14).join('\n')}`
      );
    }
  }

  for (const a of ABLATIONS) {
    const check = CHECKS[a.check];
    if (controls[a.check] !== true) {
      say(`skip  ${String(a.n).padStart(2)}  ${a.name} — its control is red`);
      continue;
    }
    const full = join(repoRoot, a.file);
    const before = originals.get(a.file);

    const find = a.find;
    if (!before.includes(find)) {
      problems.push(
        `${String(a.n)} "${a.name}": nothing to edit in ${a.file}. ` +
          'An ablation that cannot be applied proves nothing.'
      );
      continue;
    }

    writeFileSync(full, before.replace(find, a.to));
    ran += 1;
    const got = check.run();
    const wentRed = got.status !== 0;
    // The OTHER checks, so an ablation that moves the wrong rule is named. Only
    // asked when this one went red, because an ablation that changed nothing has
    // already failed above.
    let alsoRed = [];
    if (wentRed) {
      for (const [key, c] of Object.entries(CHECKS)) {
        if (key === a.check) continue;
        if (controls[key] !== true) continue;
        if (c.run().status !== 0) alsoRed.push(c.what);
      }
    }
    restore();
    if (sha(readFileSync(full, 'utf8')) !== sha(before)) {
      problems.push(`${a.file} did NOT come back byte for byte after "${a.name}"; stopping`);
      break;
    }

    if (!wentRed) {
      problems.push(
        `${String(a.n)} "${a.name}": ${check.what} stayed GREEN. A rule that cannot be made to ` +
          'fail is a rule that has stopped asking.'
      );
      continue;
    }
    red += 1;
    say(
      `ok    ${String(a.n).padStart(2)}  ${a.name}\n` +
        `              ${check.what} went red` +
        (alsoRed.length > 0 ? `, and so did ${alsoRed.join(', ')}` : ', and no other check moved')
    );
  }
} finally {
  restore();
  const wrong = [...originals].filter(
    ([rel, text]) => sha(readFileSync(join(repoRoot, rel), 'utf8')) !== sha(text)
  );
  if (wrong.length > 0) {
    process.stderr.write(`${TAG} THESE FILES DID NOT COME BACK: ${wrong.map(([r]) => r).join(', ')}\n`);
    process.exitCode = 2;
  } else {
    say(`every one of the ${String(targets.length)} files came back byte for byte, checked by sha256`);
  }
}

if (problems.length > 0) {
  for (const p of problems) process.stderr.write(`${TAG} ${p}\n`);
  process.stderr.write(`${TAG} FAILED: ${String(problems.length)} finding(s).\n`);
  process.exit(1);
}
say(
  `OK: ${String(red)} of ${String(ABLATIONS.length)} ablations reddened the check that owns them, ` +
    `one clause each, ${String(ran)} applied.`
);
process.exit(0);
