/**
 * The probe behind `npm run conformance:semantic` (Phase 259, spec §7.1).
 *
 * It runs the SHIPPING block composer, the SHIPPING validator, the SHIPPING
 * citation grader and the SHIPPING floor under node over the committed
 * fixtures in build/fixtures/semantic/, and prints what came out as ONE JSON
 * line. The gate compares that against values it derived by hand from the
 * spec, never from this code. Handed a list of module roots, it composes once
 * per root, so the gate runs the shipping tree and every ablated copy of it in
 * ONE process.
 *
 * IT SPAWNS NOTHING. No git, no Electron, no tmux, no agent, no request, NO
 * MODEL, NO TOKEN, and it reads nothing under the person's home: every fixture
 * is data and the only file system writes are the gate's own ablated copies.
 *
 * ## THE SHIPPING SURFACE THIS PROBE IS WRITTEN AGAINST
 *
 * A root that does not export one of these answers `missing: [...]` and the
 * gate FAILS naming it, rather than dying: a probe that dies is not a probe
 * that fails, which is the Phase 219 lesson.
 *
 *   enrich/compose.ts    ARCH_SEMANTIC_FACT_LINES, ARCH_SEMANTIC_FILE_SAMPLE,
 *                        ARCH_SEMANTIC_JOURNEY_LINES, ARCH_SEMANTIC_CATEGORIES,
 *                        ARCH_SEMANTIC_SYSTEM_PROMPT, ARCH_JOURNEY_SYSTEM_PROMPT,
 *                        ARCH_ENRICH_PROMPT_MAX_BYTES,
 *                        composeArchSemanticPrompt(input, partId),
 *                        composeArchJourneyPrompt(input)
 *   enrich/validate.ts   validateArchSemanticAnswer(text, context)
 *   semantic/block.ts    allocateFactLines(counts, budget)
 *   semantic/grade.ts    gradeCite(cite, sources), parseCiteAt, gateShaped
 *   semantic/floor.ts    citeFloor(files, sources)
 *   @shared/arch         ARCH_CITE_GRADES, ARCH_CITE_SLACK, ARCH_FACT_CATEGORIES
 *
 * `sources` is `ArchGradeSources`, being `{ lines, facts, decls }`, and the
 * probe hands in a version whose file reads THROW so rule 3b can prove the
 * grader opens nothing.
 *
 * Usage: tsx build/semantic-conformance-probe.mts '<json>' where the json is
 *   { "roots": [{ "name": "shipping", "root": "<abs path holding main/arch>" }] }
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixturesDir = join(repoRoot, 'build', 'fixtures', 'semantic');
const fixture = (name: string): any => JSON.parse(readFileSync(join(fixturesDir, `${name}.json`), 'utf8'));

type AnyModule = Record<string, any>;

const FACTS = fixture('facts').facts as any[];
const DECLS = fixture('decls').decls as any[];
const TRACKED = fixture('tracked').files as { path: string; lines: number }[];
const PARTS = fixture('parts');
const ANSWERS = fixture('answers').answers as Record<string, any>;
const CITATIONS = fixture('citations');
const PLANTS = fixture('plants').plants as any[];

const LINES_OF = new Map<string, number>(TRACKED.map((f) => [f.path, f.lines]));

/**
 * The grader's three lookups over the fixture. `readFile` and friends are
 * absent on purpose: there is nothing here a grader could open even if it
 * tried, and rule 3b hands in a version that throws on any such attempt.
 */
const SOURCES = {
  lines: (relPath: string): number | null => LINES_OF.get(relPath) ?? null,
  facts: (relPath: string): any[] => FACTS.filter((row) => row.file === relPath),
  decls: (relPath: string): any[] => DECLS.filter((row) => row.file === relPath)
};

/** Rule 3b's seam: every file reading path throws, and the grader must still answer. */
const THROWING = {
  ...SOURCES,
  readFileSync: (): never => {
    throw new Error('the grader opened a file; it resolves out of arch_tree_file alone');
  },
  readFile: (): never => {
    throw new Error('the grader opened a file; it resolves out of arch_tree_file alone');
  },
  open: (): never => {
    throw new Error('the grader opened a file; it resolves out of arch_tree_file alone');
  }
};

/** The parts, in the shape `ArchSemanticFactInput` wants. */
function partsOf(list: any[]): any[] {
  return list.map((p) => ({
    id: p.id,
    label: p.id,
    dirs: p.anchors,
    files: p.files,
    parsed: p.files.length,
    region: null
  }));
}

const COMPOSE_INPUT = {
  trackedFiles: TRACKED.length,
  parts: partsOf(PARTS.parts),
  facts: FACTS,
  crossings: PARTS.imports
};

/** The validator's context for a `part` ask. */
function partContext(factBlock: string, grade: unknown): Record<string, unknown> {
  return {
    kind: 'part',
    partId: 'src-main',
    partIds: PARTS.parts.map((p: any) => p.id),
    factBlock,
    grade
  };
}

async function load(root: string, rel: string, missing: string[]): Promise<AnyModule | null> {
  try {
    return (await import(pathToFileURL(join(root, rel)).href)) as AnyModule;
  } catch (err) {
    missing.push(`${rel} did not load: ${String(err).slice(0, 200)}`);
    return null;
  }
}

function need(mod: AnyModule | null, name: string, rel: string, missing: string[]): any {
  if (mod === null) return undefined;
  if (!(name in mod)) {
    missing.push(`${rel} does not export ${name}`);
    return undefined;
  }
  return mod[name];
}

/** Never let one rule's throw take the whole root down: a thrown rule is a reading. */
function guard<T>(what: string, problems: string[], body: () => T): T | null {
  try {
    return body();
  } catch (err) {
    problems.push(`${what} threw: ${String(err).slice(0, 300)}`);
    return null;
  }
}

async function forRoot(root: string): Promise<Record<string, unknown>> {
  const missing: string[] = [];
  const threw: string[] = [];

  const compose = await load(root, 'main/arch/enrich/compose.ts', missing);
  const validate = await load(root, 'main/arch/enrich/validate.ts', missing);
  const blockMod = await load(root, 'main/arch/semantic/block.ts', missing);
  const gradeMod = await load(root, 'main/arch/semantic/grade.ts', missing);
  const floorMod = await load(root, 'main/arch/semantic/floor.ts', missing);
  // `@shared/arch` inside the copied tree resolves to the SHIPPING tree, so
  // the shared constants are read out of the copy explicitly.
  const shared = await load(root, 'shared/arch.ts', missing);

  const FACT_LINES = need(compose, 'ARCH_SEMANTIC_FACT_LINES', 'compose.ts', missing);
  const FILE_SAMPLE = need(compose, 'ARCH_SEMANTIC_FILE_SAMPLE', 'compose.ts', missing);
  const JOURNEY_LINES = need(compose, 'ARCH_SEMANTIC_JOURNEY_LINES', 'compose.ts', missing);
  const CATEGORIES = need(compose, 'ARCH_SEMANTIC_CATEGORIES', 'compose.ts', missing);
  const CAP = need(compose, 'ARCH_ENRICH_PROMPT_MAX_BYTES', 'compose.ts', missing);
  const SYSTEM = need(compose, 'ARCH_SEMANTIC_SYSTEM_PROMPT', 'compose.ts', missing);
  const JOURNEY_SYSTEM = need(compose, 'ARCH_JOURNEY_SYSTEM_PROMPT', 'compose.ts', missing);
  const composePart = need(compose, 'composeArchSemanticPrompt', 'compose.ts', missing);
  const composeJourney = need(compose, 'composeArchJourneyPrompt', 'compose.ts', missing);
  const validateAnswer = need(validate, 'validateArchSemanticAnswer', 'validate.ts', missing);
  const allocate = need(blockMod, 'allocateFactLines', 'semantic/block.ts', missing);
  const gradeCite = need(gradeMod, 'gradeCite', 'semantic/grade.ts', missing);
  const parseCiteAt = need(gradeMod, 'parseCiteAt', 'semantic/grade.ts', missing);
  const citeFloor = need(floorMod, 'citeFloor', 'semantic/floor.ts', missing);
  const GRADES = need(shared, 'ARCH_CITE_GRADES', 'shared/arch.ts', missing);
  const SLACK = need(shared, 'ARCH_CITE_SLACK', 'shared/arch.ts', missing);

  if (missing.length > 0) return { missing };

  // --- rule 1: the block ---------------------------------------------------
  const composed = guard('the part composer', threw, () => composePart(COMPOSE_INPUT, 'src-main'));
  const journeyComposed = guard('the journey composer', threw, () => composeJourney(COMPOSE_INPUT));
  const block = String(composed?.factBlock ?? '');
  const prompt = String(composed?.prompt ?? '');

  // A box id the partition does not hold: a composer that guessed a neighbour
  // would be a semantic pass about the wrong part.
  const missingPart = guard('the part composer over an id nobody holds', threw, () =>
    composePart(COMPOSE_INPUT, 'no-such-box')
  );

  // Rule 1c: the same inputs with every list reversed.
  const reversed = guard('the part composer over reversed inputs', threw, () =>
    composePart(
      {
        ...COMPOSE_INPUT,
        facts: [...FACTS].reverse(),
        parts: partsOf([...PARTS.parts].reverse()),
        crossings: [...PARTS.imports].reverse()
      },
      'src-main'
    )
  );

  // Rule 1b and 1d: a fact set big enough that the budget has to allocate,
  // and big enough that the cap has to shrink it.
  const big = [...FACTS];
  for (let i = 0; i < 6000; i += 1) {
    big.push({
      category: 'effect',
      kind: 'fs-write',
      subject: `a file written under the fixture ${String(i)} with a long enough subject to cost bytes`,
      file: 'src/main/tmux/sessions.ts',
      line: 1 + (i % 299),
      rule: 'effect.fs.node',
      evidence: 'writeFileSync(p, bytes);',
      viaWrapper: false
    });
  }
  const crowded = guard('the part composer over a crowded fact set', threw, () =>
    composePart({ ...COMPOSE_INPUT, facts: big }, 'src-main')
  );

  const factLineRe = /^ {2}(\S+) (.+) at ([^\s:]+):(\d+)$/;
  const readBlock = (text: string): {
    factLines: number;
    categoryOrder: string[];
    zeroes: string[];
    byCategory: Record<string, number>;
    unresolvable: number;
    outOfBox: number;
  } => {
    const order: string[] = [];
    const zeroes: string[] = [];
    const byCategory: Record<string, number> = {};
    let category = '';
    let factLines = 0;
    let unresolvable = 0;
    let outOfBox = 0;
    const box = new Set<string>(PARTS.parts.find((p: any) => p.id === 'src-main')?.files ?? []);
    for (const line of text.split('\n')) {
      if (line === line.trim() && /^[a-z]+$/.test(line)) {
        category = line;
        order.push(line);
        continue;
      }
      if (line === '  none found by this reader') {
        zeroes.push(category);
        continue;
      }
      const hit = factLineRe.exec(line);
      if (hit === null) continue;
      factLines += 1;
      byCategory[category] = (byCategory[category] ?? 0) + 1;
      const file = hit[3];
      const at = Number(hit[4]);
      const n = LINES_OF.get(file);
      if (n === undefined || at < 1 || at > n + 1) unresolvable += 1;
      if (!box.has(file)) outOfBox += 1;
    }
    return { factLines, categoryOrder: order, zeroes, byCategory, unresolvable, outOfBox };
  };

  // Rule 1b, asked of the allocator directly as well as through the block, so
  // a block whose numbers happen to fit cannot hide an allocator that does not.
  // Seven categories in the fixed order; the sixth holds nothing.
  // Two vectors, because the ceiling behaves differently in each and a gate
  // that asked only the first would pin the wrong half. In the first every
  // category but `effect` is already at its own count, so there is NOWHERE to
  // spill and the ceiling deliberately does not bind. In the second two
  // categories are both enormous, so it does.
  const allocated = guard('the allocator, nowhere to spill', threw, () => allocate([1, 2, 12, 3, 4000, 0, 5], 120));
  const allocatedTwo = guard('the allocator, two greedy categories', threw, () => allocate([1, 2, 12, 3, 3000, 0, 5000], 120));

  // --- rule 3a: the citation grammar --------------------------------------
  const gradeOne = (at: string, src: unknown = SOURCES): string | null => {
    const row = guard(`the grader over ${at.slice(0, 40)}`, threw, () => gradeCite({ at, why: 'w' }, src));
    return row === null || row === undefined ? null : String(row.grade ?? 'null');
  };
  const grammar = {
    // The grammar half, asked of parseCiteAt, so a string refused for its
    // SHAPE is told apart from one refused because nobody tracks the file.
    parsedRefused: CITATIONS.refuse.map((c: any) => ({
      at: String(c.at).slice(0, 30),
      parsed: guard('parseCiteAt', threw, () => parseCiteAt(c.at)) !== null
    })),
    parsedAccepted: CITATIONS.accept.map((c: any) => ({
      at: c.at,
      parsed: guard('parseCiteAt', threw, () => parseCiteAt(c.at)) !== null
    })),
    // The whole question, asked of the grader the validator really uses.
    refused: CITATIONS.refuse.map((c: any) => ({ at: String(c.at).slice(0, 30), grade: gradeOne(c.at) })),
    accepted: CITATIONS.accept.map((c: any) => ({ at: c.at, grade: gradeOne(c.at) }))
  };

  // --- rule 3c and 6b: the ladder -----------------------------------------
  const ladderAt = (at: string, src: unknown = SOURCES): unknown => {
    const row = guard(`the ladder at ${at}`, threw, () => gradeCite({ at, why: 'w' }, src));
    return row === null || row === undefined
      ? null
      : { grade: row.grade ?? null, factKind: row.factKind ?? null, factSubject: row.factSubject ?? null, factLine: row.factLine ?? null };
  };
  const noDecls = { ...SOURCES, decls: (): any[] => [] };
  const ladder = {
    gate: ladderAt('src/main/fs/guarded-write.ts:200'),
    gateNear: ladderAt('src/main/fs/guarded-write.ts:203'),
    gateJustPast: ladderAt('src/main/fs/guarded-write.ts:196'),
    callSite: ladderAt('src/main/arch/ipc.ts:20'),
    declaration: ladderAt('src/main/arch/enrich/run.ts:250'),
    resolves: ladderAt('src/main/symbols/pool.ts:5'),
    factBeatsDecl: ladderAt('src/main/index.ts:64'),
    broken: ladderAt('src/main/nope.ts:1'),
    declarationWithNoDecls: (() => {
      const row = ladderAt('src/main/arch/enrich/run.ts:250', noDecls) as any;
      return row === null ? null : String(row.grade);
    })()
  };

  // --- rule 3b: resolution opens no file -----------------------------------
  const resolvesWithoutOpening = gradeOne('src/main/arch/ipc.ts:20', THROWING);

  // --- rules 3d and 5a: the floor -----------------------------------------
  const floorFiles = [
    'src/main/fs/guarded-write.ts',
    'src/main/arch/ipc.ts',
    'src/main/arch/enrich/run.ts',
    'src/main/symbols/pool.ts'
  ];
  const floor = guard('the floor', threw, () => citeFloor(floorFiles, SOURCES));
  const floorOverCited = guard('the floor over the cited files', threw, () =>
    citeFloor(
      [...new Set(ANSWERS.good.claims.flatMap((c: any) => c.facts.map((f: any) => String(f.at).split(':')[0])))] as string[],
      SOURCES
    )
  );

  // --- rule 4: the three refusals -----------------------------------------
  const ruleOn = (name: string, answer?: unknown, ctx?: Record<string, unknown>): Record<string, unknown> => {
    const text = JSON.stringify(answer ?? ANSWERS[name]);
    const ruling = guard(`the validator over ${name}`, threw, () =>
      validateAnswer(text, ctx ?? partContext(block, SOURCES))
    );
    return {
      kept: ruling === null || ruling.kept === null || ruling.kept === undefined ? null : 'kept',
      refusal: ruling?.refusal ?? null,
      rowsDropped: ruling?.rowsDropped ?? null,
      dropped: typeof ruling?.dropped === 'string' ? ruling.dropped.slice(0, 160) : null,
      claims: Array.isArray(ruling?.kept?.claims) ? ruling.kept.claims.length : null,
      gates: Array.isArray(ruling?.kept?.gates) ? ruling.kept.gates.length : null
    };
  };
  const refusals = {
    good: ruleOn('good'),
    levelValue: ruleOn('level-value'),
    levelProse: ruleOn('level-prose'),
    levelKey: ruleOn('level-key'),
    brokenRow: ruleOn('broken-row'),
    allBroken: ruleOn('all-broken'),
    invented: ruleOn('invented-number'),
    keptNumbers: ruleOn('kept-numbers')
  };

  // Rule 4c: research 118's own three planted numbers, as TOKENS of the block
  // against the substring form. BOTH readings are re-derived here rather than
  // taken from the spec's arithmetic.
  const digitRuns = (s: string): string[] => s.match(/\d+/g) ?? [];
  const planted = ['17', '4096', '92'];
  // Research 118's own two decoys, and nothing else: a fixture session named
  // `p117-lost-9` holds `17` as a SUBSTRING and never as a token, and the
  // address `192.0.2.1` holds `92` the same way. `4096` appears nowhere, so it
  // is the one number BOTH forms catch, which is what makes the pair 3 and 1
  // rather than 3 and 0.
  const decoyed = `${block}\n  fixture p117-lost-9 at src/main/index.ts:1\n  address 192.0.2.1 at src/main/index.ts:2\n`;
  const decoyTokens = new Set(digitRuns(decoyed));
  // The reading that matters is the SHIPPING validator's, one answer per
  // planted number against a block carrying the two decoys, because a reading
  // this probe computed with a regex of its own could not move when the
  // shipping clause does.
  const perNumber: Record<string, boolean> = {};
  for (const n of planted) {
    const answerText = JSON.parse(JSON.stringify(ANSWERS.good));
    answerText.claims[6].text = `It stops after ${n} of them and says so.`;
    const ruling = guard(`the validator over the planted number ${n}`, threw, () =>
      validateAnswer(JSON.stringify(answerText), partContext(decoyed, SOURCES))
    );
    perNumber[n] =
      ruling === null || ruling.kept === null || ruling.kept === undefined;
  }
  const numberRule = {
    shippingCaught: Object.values(perNumber).filter(Boolean).length,
    perNumber,
    caughtAsToken: planted.filter((n) => !decoyTokens.has(n)).length,
    caughtAsSubstring: planted.filter((n) => !decoyed.includes(n)).length,
    blockTokens: new Set(digitRuns(block)).size
  };

  // --- rule 7: the seven planted lies against the SHIPPING refusals --------
  const plants = PLANTS.map((p) => {
    const isJourney = p.answer === undefined;
    const ctx = isJourney
      ? {
          kind: 'journeys',
          partId: '',
          partIds: PARTS.parts.map((one: any) => one.id),
          factBlock: String(journeyComposed?.factBlock ?? ''),
          grade: SOURCES
        }
      : partContext(block, SOURCES);
    const ruling = guard(`the validator over the plant ${p.id}`, threw, () =>
      validateAnswer(JSON.stringify(p.answer ?? p.journeys), ctx)
    );
    const refused = ruling === null || ruling.kept === null || ruling.kept === undefined;
    const dropped = Number(ruling?.rowsDropped ?? 0);
    // EVERY PLANT CARRIES ITS OWN CONTROL, which is what stops a fixture
    // defect reading as a catch. A plant is an EDIT of an answer the shipping
    // validator keeps, so if the control is refused the plant's own reading
    // says nothing and the gate refuses the number rather than banking it.
    const controlRuling = guard(`the validator over the control for ${p.id}`, threw, () =>
      validateAnswer(JSON.stringify(p.control ?? ANSWERS.good), ctx)
    );
    const controlKept =
      controlRuling !== null && controlRuling.kept !== null && controlRuling.kept !== undefined;
    return {
      id: p.id,
      shape: p.shape,
      caught: refused || dropped > 0,
      refusal: ruling?.refusal ?? null,
      rowsDropped: dropped,
      controlKept,
      controlRefusal: controlRuling?.refusal ?? null
    };
  });

  const read = readBlock(block);
  const crowdedRead = readBlock(String(crowded?.factBlock ?? ''));

  return {
    missing: [],
    threw,
    budgets: {
      factLines: FACT_LINES,
      fileSample: FILE_SAMPLE,
      journeyLines: JOURNEY_LINES,
      cap: CAP,
      slack: SLACK,
      grades: Array.isArray(GRADES) ? [...GRADES] : null,
      categories: Array.isArray(CATEGORIES) ? [...CATEGORIES] : null
    },
    allocated,
    allocatedTwo,
    block: {
      bytes: Buffer.byteLength(block, 'utf8'),
      promptBytes: Buffer.byteLength(prompt, 'utf8'),
      ...read,
      deterministic: String(reversed?.factBlock ?? '<none>') === block,
      missingPartIsNull: missingPart === null,
      journeyBytes: Buffer.byteLength(String(journeyComposed?.factBlock ?? ''), 'utf8'),
      journeyPromptBytes: Buffer.byteLength(String(journeyComposed?.prompt ?? ''), 'utf8')
    },
    crowded: {
      promptBytes: Buffer.byteLength(String(crowded?.prompt ?? ''), 'utf8'),
      factLinesAsked: crowded?.factLines ?? null,
      ...crowdedRead
    },
    systemPrompt: {
      text: SYSTEM === undefined ? null : String(SYSTEM),
      journeyText: JOURNEY_SYSTEM === undefined ? null : String(JOURNEY_SYSTEM),
      same: String(SYSTEM) === String(JOURNEY_SYSTEM)
    },
    grammar,
    resolvesWithoutOpening,
    ladder,
    floor,
    floorOverCited,
    refusals,
    numberRule,
    plants
  };
}

async function main(): Promise<void> {
  const input = JSON.parse(process.argv[2] ?? '{}') as { roots: { name: string; root: string }[] };
  const out: Record<string, unknown> = {};
  for (const { name, root } of input.roots ?? []) {
    try {
      out[name] = await forRoot(root);
    } catch (err) {
      out[name] = { error: String(err).slice(0, 400) };
    }
  }
  process.stdout.write(`${JSON.stringify(out)}\n`);
}

void main();
