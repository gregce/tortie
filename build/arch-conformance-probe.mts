/**
 * The probe behind `npm run conformance:arch` (Phase 63).
 *
 * It runs the product's own loader, validator, five checkers and skeleton
 * generator over the committed fixture in build/fixtures/arch/, and prints one
 * JSON document for build/conformance-arch.mjs to assert on.
 *
 * It starts nothing. The git seam is a fake that turns the fixture's fields
 * into the exact bytes git would have printed, so the parsers in
 * src/main/arch/git-facts.ts are exercised beside the checkers, and every argv
 * the run composes is recorded rather than spawned. That is what lets the gate
 * assert the argv defense over every call the run made rather than over the
 * ones a live repository happened to need.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ArchGitCall } from '../src/main/arch/argv-guard';
import { ARCH_ARGV_WORDS, assertArchArgv } from '../src/main/arch/argv-guard';
import type { ArchGitRunner, ArchGitResult } from '../src/main/arch/git-facts';
import { createArchFileSystem, loadArchDocument } from '../src/main/arch/load';
import { coverageSentence } from '../src/main/arch/checkers';
import { runArchCheck } from '../src/main/arch/run';
import { draftSkeleton } from '../src/main/arch/skeleton';
import type { ArchImportResolution } from '../src/main/arch/db';
import {
  archResolveContext,
  resolveImport,
  type ArchResolverLanguage
} from '../src/main/arch/resolver';
import { ARCH_ROW_KEYS } from '../src/shared/arch';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = join(root, 'build', 'fixtures', 'arch');

interface Facts {
  headCommit: string;
  trackedFiles: string[];
  headBytes: Record<string, string>;
  log: { commit: string; paths: string[] }[];
  status: string[];
  imports: {
    fromPath: string;
    specifier: string;
    line: number;
    toPath: string | null;
    resolution: ArchImportResolution;
    reason: string | null;
  }[];
  unparsed: { language: string; files: number }[];
  resolverProbe: {
    goModule: string;
    packageName: string;
    dependencies: string[];
    specifiers: {
      language: ArchResolverLanguage;
      fromPath: string;
      specifier: string;
    }[];
  };
  hostileStrings: string[];
}

const facts = JSON.parse(
  readFileSync(join(fixtureRoot, 'facts.json'), 'utf8')
) as Facts;

const NUL = '\u0000';

/**
 * The fake git, which prints what git would have printed and starts nothing.
 *
 * Every answer is composed from the fixture, in git's own wire shapes, so the
 * readers in git-facts.ts are proved here rather than assumed.
 */
function fakeGit(record: ArchGitCall[], options?: { uncommittedContract?: boolean }): ArchGitRunner {
  const log = options?.uncommittedContract === true
    ? facts.log.filter(
        (entry) =>
          !entry.paths.some((p) => p === 'docs/arch' || p.startsWith('docs/arch/'))
      )
    : facts.log;
  return {
    run(call: ArchGitCall): Promise<ArchGitResult> {
      const ok = (stdout: Buffer): ArchGitResult => ({ code: 0, stdout, stderr: '' });
      if (call.kind === 'ls-files') {
        return Promise.resolve(
          ok(Buffer.from(facts.trackedFiles.map((p) => `${p}${NUL}`).join(''), 'utf8'))
        );
      }
      if (call.kind === 'rev-parse-head') {
        return Promise.resolve(ok(Buffer.from(`${facts.headCommit}\n`, 'utf8')));
      }
      if (call.kind === 'status-porcelain') {
        return Promise.resolve(
          ok(Buffer.from(facts.status.map((e) => `${e}${NUL}`).join(''), 'utf8'))
        );
      }
      if (call.kind === 'log-name-only') {
        const parts: string[] = [];
        for (const entry of log) {
          // git writes the format, then a newline, then zero separated paths.
          parts.push(`${entry.commit}\n${entry.paths.join(NUL)}${NUL}`);
        }
        return Promise.resolve(ok(Buffer.from(parts.join(''), 'utf8')));
      }
      // cat-file --batch, one header per request.
      const requests = (call.stdin ?? '').split('\n').filter((l) => l.length > 0);
      const chunks: Buffer[] = [];
      for (const request of requests) {
        const path = request.startsWith('HEAD:') ? request.slice(5) : request;
        const text = facts.headBytes[path];
        if (text === undefined) {
          chunks.push(Buffer.from(`${request} missing\n`, 'utf8'));
          continue;
        }
        const bytes = Buffer.from(text, 'utf8');
        chunks.push(
          Buffer.from(
            `0000000000000000000000000000000000000000 blob ${bytes.byteLength}\n`,
            'utf8'
          )
        );
        chunks.push(bytes);
        chunks.push(Buffer.from('\n', 'utf8'));
      }
      return Promise.resolve(ok(Buffer.concat(chunks)));
    }
  };
}

async function main(): Promise<void> {
  // -------------------------------------------------------------------------
  // 1. The load, over the fixture's own docs/arch tree
  // -------------------------------------------------------------------------
  const document = await loadArchDocument(createArchFileSystem(fixtureRoot));

  // -------------------------------------------------------------------------
  // 2. The run, with every composed call recorded and nothing spawned
  // -------------------------------------------------------------------------
  const record: ArchGitCall[] = [];
  const result = await runArchCheck({
    document,
    git: fakeGit(record),
    record,
    imports: () =>
      Promise.resolve({ imports: facts.imports, unparsed: facts.unparsed })
  });

  // -------------------------------------------------------------------------
  // 2.5 The same run again, over a history that never committed the contract
  // -------------------------------------------------------------------------
  // THIS IS THE CASE THE FIRST FIX MISSED, and it is the common case rather
  // than the exotic one: a person drafts a contract and has not committed it,
  // so no commit in the whole history touches docs/arch. The walk finds no
  // boundary, and the first fix fell out of the bottom of that loop handing
  // back every commit it had walked, which is the whole history. Measured on
  // this repository on 2026-08-26 before the second fix: 530 commits walked, 0
  // touching docs/arch, 530 returned, and the main process read "169 commits
  // have landed since this was written" about a contract two minutes old.
  //
  // The fixture's own log is filtered rather than replaced, so this run reads
  // the same parts, the same anchors and the same uncommitted files as the run
  // above, and the ONLY thing that changed is whether the contract is
  // committed. Every sentence it produces is pinned in expected.json.
  const uncommittedRecord: ArchGitCall[] = [];
  const uncommittedResult = await runArchCheck({
    document,
    git: fakeGit(uncommittedRecord, { uncommittedContract: true }),
    record: uncommittedRecord,
    imports: () =>
      Promise.resolve({ imports: facts.imports, unparsed: facts.unparsed })
  });

  // -------------------------------------------------------------------------
  // 3. The skeleton, drafted twice, so the gate can compare the bytes
  // -------------------------------------------------------------------------
  const skeletonInput = {
    subject: 'A small imaginary app',
    trackedFiles: facts.trackedFiles,
    imports: facts.imports
      .filter((i) => i.toPath !== null)
      .map((i) => ({ fromPath: i.fromPath, toPath: i.toPath as string }))
  };
  const draftOne = draftSkeleton(skeletonInput);
  const draftTwo = draftSkeleton(skeletonInput);

  // -------------------------------------------------------------------------
  // 4. The two controls, both inverted, so the gate proves its own teeth
  // -------------------------------------------------------------------------
  // The guard must refuse a contract value outright.
  let guardRefused = false;
  let guardMessage = '';
  try {
    assertArchArgv(['ls-files', 'src/hostile-anchor-63-x']);
  } catch (err) {
    guardRefused = true;
    guardMessage = (err as Error).message;
  }
  // THE NARROWING, PROVED RATHER THAN ASSERTED. The first build also accepted a
  // forty character object name and a range of two, for a freshness walk that
  // takes no range and never did. Both shapes are things a contract can legally
  // hold: `oidField` guarantees forty lower case hex by construction, and a
  // range is an ordinary anchor. So the gate asks the guard about all three and
  // requires a refusal for each.
  const narrowed: { value: string; refused: boolean }[] = [];
  for (const value of [
    'a'.repeat(40),
    '0123456789abcdef0123456789abcdef01234567',
    'HEAD..HEAD',
    `${'a'.repeat(40)}..${'b'.repeat(40)}`
  ]) {
    let refused = false;
    try {
      assertArchArgv([value]);
    } catch {
      refused = true;
    }
    narrowed.push({ value, refused });
  }

  // A record holding a hostile element, so the gate can prove its scan bites.
  const blindedRecord = [
    ...record.map((call) => ({ kind: call.kind, argv: [...call.argv], stdin: call.stdin })),
    { kind: 'ls-files', argv: ['ls-files', '-z', 'src/hostile-anchor-63-*'], stdin: undefined }
  ];

  // -------------------------------------------------------------------------
  // 5. The resolver matrix, from the REAL resolver rather than from the facts
  // -------------------------------------------------------------------------
  // The first build of this gate bucketed `facts.imports` by file extension, so
  // each row reported numbers an author had written into the fixture rather
  // than answers the resolver gave, and it printed the two deferred languages
  // as "0 resolved, 1 unresolved" while the arm column said unverifiable,
  // conflating the two answers the whole design keeps apart. So the specifiers
  // below go through `resolveImport` itself, and the row is an assertion about
  // the code.
  const probeCtx = archResolveContext(
    {
      packageName: facts.resolverProbe.packageName,
      dependencies: new Set(facts.resolverProbe.dependencies),
      aliases: [],
      workspaces: new Map(),
      goModule: facts.resolverProbe.goModule,
      hasCargo: true,
      hasPython: true
    },
    facts.trackedFiles
  );
  const matrix = new Map<string, Record<ArchImportResolution, number>>();
  for (const row of facts.resolverProbe.specifiers) {
    const answers =
      matrix.get(row.language) ??
      ({ 'first-party': 0, external: 0, unresolved: 0, unverifiable: 0 } as Record<
        ArchImportResolution,
        number
      >);
    const answer = resolveImport(row.specifier, row.fromPath, row.language, probeCtx);
    answers[answer.resolution] += 1;
    matrix.set(row.language, answers);
  }

  // -------------------------------------------------------------------------
  // 6. What the source tree itself must be true about
  // -------------------------------------------------------------------------
  const archDir = join(root, 'src', 'main', 'arch');
  const walk = (dir: string): string[] => {
    const out: string[] = [];
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      if (name.name === '__tests__') continue;
      const path = join(dir, name.name);
      if (name.isDirectory()) out.push(...walk(path));
      else if (path.endsWith('.ts')) out.push(path);
    }
    return out;
  };
  const sources = walk(archDir).map((path) => ({
    path: path.slice(root.length + 1),
    text: readFileSync(path, 'utf8')
  }));

  process.stdout.write(
    JSON.stringify(
      {
        document: {
          contract: document.contract,
          componentIds: document.components.map((c) => c.id).sort(),
          edgeIds: document.edges.map((e) => e.id).sort(),
          acceptedCount: document.baseline.accepted.length,
          problems: document.problems
        },
        verdicts: result?.verdicts ?? [],
        // THE FRESHNESS SENTENCES, WORD FOR WORD. Nothing checked these in the
        // first build, which is how a sentence reporting the whole history as
        // staleness shipped. The fixture's log carries a commit that touched
        // docs/arch, so a row that counts past it is a regression the table
        // catches.
        freshness: (result?.verdicts ?? [])
          .filter((v) => v.subjectId.endsWith('#freshness'))
          .map((v) => ({ subjectId: v.subjectId, sentence: v.reason ?? '' })),
        // THE SAME SENTENCES over a history that never committed the
        // contract. Nothing may have landed under any part, because the
        // contract was written after HEAD. The uncommitted file clause is
        // unaffected and must still be there, which is what proves this run is
        // the same run and not a blank one.
        freshnessUncommittedContract: (uncommittedResult?.verdicts ?? [])
          .filter((v) => v.subjectId.endsWith('#freshness'))
          .map((v) => ({ subjectId: v.subjectId, sentence: v.reason ?? '' })),
        counts: result?.counts ?? null,
        sentence: result === null ? '' : coverageSentence(result.counts),
        perChecker: (result?.results ?? []).map((r) => ({
          checker: r.checker,
          verdicts: r.verdicts.length
        })),
        record: record.map((call) => ({
          kind: call.kind,
          argv: [...call.argv],
          stdin: call.stdin ?? null
        })),
        blindedRecord,
        guard: {
          refused: guardRefused,
          message: guardMessage,
          words: [...ARCH_ARGV_WORDS],
          narrowed
        },
        skeleton: {
          paths: draftOne.map((b) => b.path),
          repeatable: JSON.stringify(draftOne) === JSON.stringify(draftTwo),
          text: draftOne.map((b) => b.text).join('')
        },
        matrix: [...matrix.entries()].map(([language, row]) => ({
          language,
          firstParty: row['first-party'],
          external: row.external,
          unresolved: row.unresolved,
          unverifiable: row.unverifiable
        })),
        rowKeys: ARCH_ROW_KEYS,
        sources,
        hostileStrings: facts.hostileStrings
      },
      null,
      0
    )
  );
}

await main();
