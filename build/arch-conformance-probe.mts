/**
 * The probe behind `npm run conformance:arch` (Phase 63, plus the payload
 * composer in Phase 64).
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
import {
  ARCH_PAYLOAD_MAX_FILES_PER_PART,
  composeArchPayload,
  type ArchPayloadInput
} from '../src/main/arch/payload';
import { archGapId } from '../src/shared/arch-ids';
import { ARCH_PROSE_MAX_COMMITS_BEHIND } from '../src/shared/arch-copy';
import type { ArchFreshness, ArchVerdict } from '../src/shared/arch';
import { checkImports, coverageSentence } from '../src/main/arch/checkers';
import type { ArchFactBase, ArchImportFact } from '../src/main/arch/checkers/facts';
import { gatherFacts, runArchCheck } from '../src/main/arch/run';
import { composeArchMap, composeArchMapPart } from '../src/main/arch/map';
import { draftSkeleton } from '../src/main/arch/skeleton';
import type { ArchImportResolution } from '../src/main/arch/db';
import {
  archResolveContext,
  resolveImport,
  RESOLVER_MATRIX,
  type ArchResolveContext,
  type ArchResolverLanguage
} from '../src/main/arch/resolver';
import { languageOf } from '../src/main/arch/scan';
import { GRAMMARS } from '../src/main/symbols/languages';
import type { ImportForm } from '../src/main/symbols/queries';
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
    /**
     * Extra files, per language, that only that language's rows resolve
     * against.
     *
     * The fixture's `trackedFiles` holds no crate and no `.rb` file, and adding
     * one there would move every other checker's expected counts, because they
     * are all computed over that list. So each arm gets its own file list and
     * its own context, and `trackedFiles` is left exactly as it was.
     */
    files: Partial<Record<ArchResolverLanguage, string[]>>;
    /** The Cargo manifest, carried as data. This gate opens no repository. */
    cargo: {
      crates: [string, string][];
      dependencies: string[];
      pathDependencies: [string, string][];
    };
    python: {
      name: string | null;
      dependencies: string[];
      declaredRoots: string[];
      sources: string[];
    };
    ruby: { gems: string[]; requirePaths: string[]; present: boolean };
    specifiers: {
      language: ArchResolverLanguage;
      fromPath: string;
      specifier: string;
      /** Ruby only. `require` unless the row says otherwise. */
      form?: ImportForm;
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
  // Phase 63's verifier found this section bucketing `facts.imports` by file
  // extension, so each row reported numbers an author had written into the
  // fixture rather than answers the resolver gave, and it printed the two
  // deferred languages as "0 resolved, 1 unresolved" while the arm column said
  // unverifiable, conflating the two answers the whole design keeps apart. That
  // was fixed inside Phase 63's own fix round, and the specifiers below have
  // gone through `resolveImport` itself ever since.
  //
  // PHASE 157 TOOK IT ONE LEVEL UP, because the same defect was still here in a
  // different shape. `RESOLVER_MATRIX` is a HAND WRITTEN table in
  // src/main/arch/resolver/index.ts claiming which languages resolve, and
  // nothing asked the code whether that was true. So the run now emits three
  // things beside the counts: what the table CLAIMS, what the scanner can
  // actually produce, and what the arms really answered. The gate cross checks
  // all three.
  const manifestsForProbe = {
    packageName: facts.resolverProbe.packageName,
    dependencies: new Set(facts.resolverProbe.dependencies),
    aliases: [],
    workspaces: new Map(),
    goModule: facts.resolverProbe.goModule,
    hasCargo: true,
    hasPython: true,
    cargo: {
      crates: new Map(
        facts.resolverProbe.cargo.crates.map(([name, dir]) => [
          name,
          { name, dir }
        ])
      ),
      dependencies: new Set(facts.resolverProbe.cargo.dependencies),
      pathDependencies: new Map(facts.resolverProbe.cargo.pathDependencies)
    },
    python: {
      name: facts.resolverProbe.python.name,
      dependencies: new Set(facts.resolverProbe.python.dependencies),
      declaredRoots: facts.resolverProbe.python.declaredRoots,
      sources: facts.resolverProbe.python.sources
    },
    ruby: {
      gems: new Set(facts.resolverProbe.ruby.gems),
      requirePaths: facts.resolverProbe.ruby.requirePaths,
      present: facts.resolverProbe.ruby.present
    }
  };
  const baseCtx = archResolveContext(manifestsForProbe, facts.trackedFiles);
  // One context per language that brought files of its own. Every other
  // language uses the base one, so no other checker's expected counts move.
  const perLanguageCtx = new Map<ArchResolverLanguage, ArchResolveContext>();
  for (const [language, extra] of Object.entries(facts.resolverProbe.files)) {
    perLanguageCtx.set(
      language as ArchResolverLanguage,
      archResolveContext(manifestsForProbe, [...facts.trackedFiles, ...extra])
    );
  }
  const ctxFor = (language: ArchResolverLanguage): ArchResolveContext =>
    perLanguageCtx.get(language) ?? baseCtx;

  const matrix = new Map<string, Record<ArchImportResolution, number>>();
  const answers: {
    language: ArchResolverLanguage;
    specifier: string;
    fromPath: string;
    resolution: ArchImportResolution;
    toPath: string | null;
  }[] = [];
  for (const row of facts.resolverProbe.specifiers) {
    const bucket =
      matrix.get(row.language) ??
      ({ 'first-party': 0, external: 0, unresolved: 0, unverifiable: 0 } as Record<
        ArchImportResolution,
        number
      >);
    const answer = resolveImport(
      row.specifier,
      row.fromPath,
      row.language,
      ctxFor(row.language),
      row.form
    );
    bucket[answer.resolution] += 1;
    matrix.set(row.language, bucket);
    answers.push({
      language: row.language,
      specifier: row.specifier,
      fromPath: row.fromPath,
      resolution: answer.resolution,
      toPath: answer.toPath
    });
  }

  // WHAT THE SCANNER CAN PRODUCE, derived by running `languageOf` itself over
  // one filename per shipped grammar. It is not a list written here: the
  // extension map lives in src/main/symbols/languages.ts and the fall through
  // lives in src/main/arch/scan.ts, and this asks both of them.
  const EXTENSION_FOR: Readonly<Record<string, string>> = {
    typescript: 'ts',
    tsx: 'tsx',
    javascript: 'js',
    go: 'go',
    python: 'py',
    rust: 'rs',
    ruby: 'rb'
  };
  const scannerLanguages = [
    ...new Set(
      GRAMMARS.map(
        (grammar) => languageOf(`probe/file.${EXTENSION_FOR[grammar] ?? grammar}`)
      ).filter((language): language is ArchResolverLanguage => language !== null)
    )
  ].sort();

  // -------------------------------------------------------------------------
  // 5.5 THE FALSE GREEN, run rather than described
  // -------------------------------------------------------------------------
  // THIS IS PHASE 157'S WHOLE POINT AND IT IS THE ONLY CONTROL IN THIS GATE
  // THAT PROVES THE STAKE RATHER THAN THE BEHAVIOUR.
  //
  // Every arm is bound by one rule: an arm that cannot answer returns
  // `unresolved`, NEVER `external`. The reason is mechanical and it is in
  // src/main/arch/checkers/imports.ts. An `external` is dropped from BOTH sides
  // of the ledger there, so it is neither a crossing nor an unresolved one, and
  // a `must-not` promise whose only import across it wore that answer comes
  // back CONVERGENT. Green. About a promise nobody verified.
  //
  // So the same promise is judged twice over the same real answers. Once as the
  // arms really answered, and once with every `unresolved` rewritten to
  // `external`, which is exactly the defect Phase 63's verifier caught. The
  // shipped run must say `unverifiable` and the sloppy run must say
  // `convergent`. If the two ever agree, either the arms have started guessing
  // or the checker has stopped caring, and both are the same catastrophe.
  const falseGreenComponents = [
    {
      id: 'probe-source',
      name: 'Probe source',
      kind: 'module' as const,
      layer: 'main',
      provenance: 'human' as const,
      anchors: ['probe/src/**'],
      boundary: 'open' as const,
      description: '',
      evidence: [],
      deprecated: false,
      gaps: []
    },
    {
      id: 'probe-target',
      name: 'Probe target',
      kind: 'module' as const,
      layer: 'main',
      provenance: 'human' as const,
      anchors: ['probe/target/**'],
      boundary: 'open' as const,
      description: '',
      evidence: [],
      deprecated: false,
      gaps: []
    }
  ];
  const falseGreenEdgeId = 'probe-source-must-not-probe-target';
  const falseGreenBase = {
    contract: document.contract,
    components: falseGreenComponents,
    edges: [
      {
        id: falseGreenEdgeId,
        from: 'probe-source',
        to: 'probe-target',
        kind: 'imports' as const,
        rule: 'must-not' as const,
        checker: 'imports' as const,
        evidence: []
      }
    ],
    baseline: { accepted: [] },
    trackedFiles: ['probe/src/app.rb', 'probe/target/thing.rb'],
    manifest: { dependencies: new Set<string>(), scripts: new Map<string, string>() },
    headBytes: new Map<string, string | null>(),
    commitsBehind: new Map<string, number>(),
    uncommittedFiles: new Map<string, number>(),
    headCommit: facts.headCommit,
    unparsed: []
  };
  // The one import out of the source part, wearing the answer a real arm gives
  // a name no manifest declared, and then wearing the answer a lazy arm gives.
  const falseGreenImport = (resolution: ArchImportResolution): ArchImportFact => ({
    fromPath: 'probe/src/app.rb',
    specifier: 'active_support',
    line: 1,
    toPath: null,
    resolution,
    reason: null
  });
  const shippedAnswerForUndeclared = resolveImport(
    'active_support',
    'probe/src/app.rb',
    'ruby',
    ctxFor('ruby'),
    'require'
  ).resolution;
  const judge = (resolution: ArchImportResolution): string => {
    const facts_ = {
      ...falseGreenBase,
      imports: [falseGreenImport(resolution)],
      manifest: falseGreenBase.manifest
    } as unknown as ArchFactBase;
    const verdict = checkImports(facts_).verdicts.find(
      (v) => v.subjectId === `edge:${falseGreenEdgeId}`
    );
    return verdict === undefined ? 'MISSING' : verdict.status;
  };
  const falseGreen = {
    // What the shipped Ruby arm really answers for a gem nobody declared.
    shippedAnswer: shippedAnswerForUndeclared,
    // The verdict on the must-not promise under that answer.
    shippedVerdict: judge(shippedAnswerForUndeclared),
    // The verdict under the Phase 63 defect, being the same fact wearing
    // `external`. This one is the lie the whole rule exists to prevent.
    sloppyVerdict: judge('external')
  };

  // -------------------------------------------------------------------------
  // 5.5 The payload composer (Phase 64)
  // -------------------------------------------------------------------------
  // The composer is PURE, so it is driven here as data in and bytes out. It
  // starts nothing, it opens no file and it composes no argv, which is why
  // there is no fake to build for it.
  //
  // Five compositions, and each one exists to fail on a different regression.
  //
  //   1. A rich selection, composed TWICE with the second selection shuffled
  //      and carrying a repeat, so the gate can prove the bytes do not depend
  //      on the order a person clicked in.
  //   2. The same selection with a doctored freshness row, which is the only
  //      way to reach the two grade rule over a fixture whose whole history is
  //      four commits. Every authored line must vanish and be replaced by one
  //      line per part naming the count.
  //   3. A part whose anchors resolve to nothing at HEAD, which is the broken
  //      target gate.
  //   4. A fact base whose repository name, tracked path and import specifier
  //      carry an escape, a carriage return and a NUL. The block is delivered
  //      as ONE bracketed paste, and a control character inside it can end that
  //      paste early and hand what follows to the agent as keystrokes. None of
  //      those three values went through the contract validator.
  const payloadRecord: ArchGitCall[] = [];
  const payloadFacts = await gatherFacts({
    document,
    git: fakeGit(payloadRecord),
    record: payloadRecord,
    imports: () =>
      Promise.resolve({ imports: facts.imports, unparsed: facts.unparsed })
  });
  const callsBefore = payloadRecord.length;

  /** The checker verdicts as the store would hand them back. */
  const storedVerdicts: ArchVerdict[] = (result?.verdicts ?? []).map((verdict) => ({
    subjectId: verdict.subjectId,
    status: verdict.status,
    coverage: verdict.coverage,
    ...(verdict.offending === undefined ? {} : { offending: verdict.offending }),
    checkedAtCommit: facts.headCommit,
    generation: 1,
    firstCheck: false,
    reason: verdict.reason,
    durationMs: 0
  }));

  const freshnessRows: ArchFreshness[] = (payloadFacts?.components ?? []).map(
    (component) => ({
      componentId: component.id,
      commitsBehind: payloadFacts?.commitsBehind.get(component.id) ?? 0,
      uncommittedFiles: payloadFacts?.uncommittedFiles.get(component.id) ?? 0
    })
  );

  const payloadBase: ArchPayloadInput = {
    repoName: 'imaginary',
    document,
    trackedFiles: facts.trackedFiles,
    verdicts: storedVerdicts,
    freshness: freshnessRows,
    counts: result?.counts ?? {
      checkedHold: 0,
      broke: 0,
      cannotCheck: 0,
      accepted: 0,
      unresolvedImports: 0,
      totalImports: 0
    },
    checkedAtCommit: facts.headCommit,
    selection: {
      // app, core and store together carry every shape the block can hold: an
      // interior promise, a crossing promise in each direction, the planted
      // divergence with an accepted row beside an open one, a closed boundary,
      // a stale evidence quote, and a part with a gap.
      componentIds: ['app', 'core', 'store'],
      gapIds: [archGapId('core', 0)],
      // A verdict about a part nobody selected, so the block has to carry it
      // under its own heading rather than dropping it on the floor.
      verdictIds: ['component:left-pad#manifest']
    }
  };

  const payloadOne = composeArchPayload(payloadBase);
  const payloadTwo = composeArchPayload({
    ...payloadBase,
    selection: {
      componentIds: ['store', 'app', 'core', 'core'],
      gapIds: [archGapId('core', 0)],
      verdictIds: ['component:left-pad#manifest']
    }
  });

  // The second grade. Every part is pushed past the threshold, so no authored
  // line may survive and every part with prose carries the line that says why.
  const stalePayload = composeArchPayload({
    ...payloadBase,
    freshness: freshnessRows.map((row) => ({
      ...row,
      commitsBehind: ARCH_PROSE_MAX_COMMITS_BEHIND + 14
    }))
  });

  // The broken target gate. `hostile-glob` anchors at a pattern no tracked file
  // matches, which is exactly a scope pointing at something that is gone.
  const brokenPayload = composeArchPayload({
    ...payloadBase,
    selection: { componentIds: ['hostile-glob'], gapIds: [], verdictIds: [] }
  });

  const ESC = String.fromCharCode(27);
  const CR = String.fromCharCode(13);
  const NUL = String.fromCharCode(0);
  const hostileControl = `${ESC}[201~${CR}whoami${NUL}`;
  const hostilePayload = composeArchPayload({
    ...payloadBase,
    repoName: `imaginary${hostileControl}`,
    trackedFiles: [...facts.trackedFiles, `src/app/evil${hostileControl}.ts`],
    verdicts: storedVerdicts.map((verdict) =>
      verdict.offending === undefined
        ? verdict
        : {
            ...verdict,
            offending: verdict.offending.map((place) => ({
              ...place,
              specifier: `${place.specifier}${hostileControl}`
            }))
          }
    )
  });

  /**
   * Does this block carry a character a bracketed paste must not carry?
   *
   * Newline is the one exception, because the block is many lines and xterm
   * turns each one into a carriage return inside the paste markers, which is
   * the transport research 16 section 1 measured. Everything else below 32,
   * and delete, ends or corrupts the paste.
   */
  const hasControl = (text: string): boolean =>
    [...text].some((ch) => {
      const code = ch.charCodeAt(0);
      return (code < 32 && code !== 10) || code === 127;
    });

  const controlOffenders: string[] = [];
  for (const [name, text] of [
    ['rich', payloadOne.text],
    ['stale', stalePayload.text],
    ['broken', brokenPayload.text],
    ['hostile', hostilePayload.text]
  ] as [string, string][]) {
    if (hasControl(text)) controlOffenders.push(name);
  }

  // The control that proves the scan bites, being the same test over a block
  // with one escape put back on purpose. A scan that cannot fail proves
  // nothing.
  const blindedCaught = hasControl(`${payloadOne.text}${ESC}[201~`);

  // -------------------------------------------------------------------------
  // 6. What the source tree itself must be true about
  // -------------------------------------------------------------------------
  // 6.5 The map, composed twice, the second time from shuffled facts, plus the
  // computed-only picture (Phase 160). The composer is PURE: it is handed the
  // same fact base the run above used, it composes no git call, and the two
  // states the charter demands both come out of the same boxes, being the
  // person's names over a contract and the computed names over none.
  // -------------------------------------------------------------------------
  const mapCallsBefore = payloadRecord.length;
  const mapInput = {
    subject: 'A small imaginary app',
    trackedFiles: facts.trackedFiles,
    imports: facts.imports,
    document,
    verdicts: storedVerdicts
  };
  const mapOne = composeArchMap(mapInput);
  const mapTwo = composeArchMap({
    ...mapInput,
    trackedFiles: [...facts.trackedFiles].reverse(),
    imports: [...facts.imports].reverse()
  });
  const mapNoContract = composeArchMap({
    ...mapInput,
    document: null,
    verdicts: []
  });
  const mapCallsAfter = payloadRecord.length;

  // -------------------------------------------------------------------------
  // 6.6 The drilled part (Phase 161), composed twice, the second time from
  // shuffled facts, plus the unknown group answer and the computed-only
  // scope. The scoped composer is PURE too: no git call may be added, the
  // crossing edges must carry the outside parts' names, and a group id the
  // partition does not hold must answer known false rather than throwing.
  // -------------------------------------------------------------------------
  const partCallsBefore = payloadRecord.length;
  const partOne = composeArchMapPart({ ...mapInput, groupId: 'src-app' });
  const partTwo = composeArchMapPart({
    ...mapInput,
    trackedFiles: [...facts.trackedFiles].reverse(),
    imports: [...facts.imports].reverse(),
    groupId: 'src-app'
  });
  const partNoContract = composeArchMapPart({
    ...mapInput,
    document: null,
    verdicts: [],
    groupId: 'src-app'
  });
  const partUnknown = composeArchMapPart({
    ...mapInput,
    groupId: 'no-such-part'
  });
  const partCallsAfter = payloadRecord.length;

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
        // The hand written claim, so the gate can hold it against the answers
        // above rather than trusting it.
        declaredMatrix: RESOLVER_MATRIX.map((r) => ({
          language: r.language,
          resolves: r.resolves,
          reason: r.reason
        })),
        // What `languageOf` really produces for every shipped grammar. A
        // grammar missing from `ArchResolverLanguage` shows up here as a
        // language the table never named, and it would be read by the script
        // arm.
        scannerLanguages,
        // Every answer, one row each, so the gate can say which specifier moved
        // rather than only that a count did.
        answers,
        falseGreen,
        payload: {
          text: payloadOne.text,
          bytes: payloadOne.bytes,
          repeatable: payloadOne.text === payloadTwo.text,
          brokenTarget: payloadOne.brokenTarget,
          brokenTargetIds: payloadOne.brokenTargetIds,
          proseWithheld: payloadOne.proseWithheld,
          unknownIds: payloadOne.unknownIds,
          truncated: payloadOne.truncated,
          counts: payloadOne.counts,
          maxFilesPerPart: ARCH_PAYLOAD_MAX_FILES_PER_PART,
          proseThreshold: ARCH_PROSE_MAX_COMMITS_BEHIND,
          stale: {
            text: stalePayload.text,
            proseWithheld: stalePayload.proseWithheld
          },
          broken: {
            text: brokenPayload.text,
            brokenTarget: brokenPayload.brokenTarget,
            brokenTargetIds: brokenPayload.brokenTargetIds,
            deadAnchors: brokenPayload.deadAnchors
          },
          hostile: { text: hostilePayload.text },
          controlOffenders,
          blindedCaught,
          // Composing starts nothing at all, so the call count cannot move.
          callsBefore,
          callsAfter: payloadRecord.length
        },
        map: {
          repeatable: JSON.stringify(mapOne) === JSON.stringify(mapTwo),
          model: mapOne,
          noContract: mapNoContract,
          callsBefore: mapCallsBefore,
          callsAfter: mapCallsAfter
        },
        part: {
          repeatable: JSON.stringify(partOne) === JSON.stringify(partTwo),
          model: partOne,
          noContract: partNoContract,
          unknown: partUnknown,
          callsBefore: partCallsBefore,
          callsAfter: partCallsAfter
        },
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
