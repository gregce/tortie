/**
 * agree.mts — reading (b) of the Phase 259 measurement: how far a model's
 * reading agrees with the hand pass a person wrote (spec §5.3(b)).
 *
 *   tsx build/p259/agree.mts <reading.json> [--hand build/p256/semantic/tortie.pass.json]
 *   tsx build/p259/agree.mts --self-test        (reads nothing, launches nothing)
 *
 * THREE NUMBERS AND NO SIMILARITY SCORE. Every one of them is recomputable by
 * a second person from the two JSON files alone, which is the whole point: a
 * judge's impression of "close enough" is not a measurement, and a cosine over
 * embeddings would be a third model reading the output of the first two.
 *
 *   1  PART NAMING.  Each of the hand pass's nine components is mapped to the
 *      model part whose ANCHOR FILE SET has the largest Jaccard overlap with
 *      the hand component's CITED files. The mapping is COMPUTED here and
 *      printed; it is never chosen by a judge. The verifier then answers,
 *      blind to which agent wrote it, whether the model's `name` and `does`
 *      describe the same job, and reports n of 9. This file prints the mapping
 *      and the overlap it was chosen on; it does NOT grade the prose, because
 *      grading prose is what the person is for.
 *   2  CONTRACT-FIELD CITATION OVERLAP.  For each mapped pair,
 *      |files cited by both| / |files the hand component cites|. Nine values
 *      and their mean.
 *   3  JOURNEY STEP AGREEMENT.  For each of the three hand journeys, the
 *      longest common subsequence of PART IDS between the hand steps and the
 *      model's steps, over the hand journey's step count. The hand journeys
 *      name hand components, so mapping 1 is applied first and is printed.
 *
 * WHY A JACCARD AND NOT A NAME MATCH. The hand pass's components are a
 * person's nine parts and the model's are rule P's eight boxes; the two
 * vocabularies do not meet. Files are the one thing both sides name, so files
 * are what the mapping is computed over. A hand component whose best overlap
 * is ZERO is reported UNMAPPED rather than forced onto a box, because a forced
 * pair would inflate readings 2 and 3 with a pair nobody would defend.
 *
 * It spawns nothing, opens no keychain, makes no request, reads nothing under
 * the person's home, and writes nothing unless `--out` names a file.
 */

import { readFileSync, writeFileSync } from 'node:fs';

interface Cite { at: string; why?: string }
interface HandComponent { id: string; name: string; facts?: Cite[] }
interface HandStep { componentId: string; facts?: Cite[] }
interface HandJourney { id: string; steps: HandStep[] }
interface HandPass { components: HandComponent[]; journeys: HandJourney[] }

/** The model reading, as `arch:semantic` answers it (spec §3.4). */
interface Reading {
  // THE SHIPPED FIELD IS `cites`. This file was written against a guessed
  // shape and read `citations`, which no answer carries, so every model file
  // set came back EMPTY and all nine components read an overlap of zero that
  // looked like total disagreement. Both names are accepted now, and the
  // shipped one is what the real reading uses.
  parts?: {
    id: string;
    name?: string | null;
    files?: string[];
    claims?: { field: string; cites?: Cite[]; citations?: Cite[] }[];
  }[];
  journeys?: { id: string; steps?: { partId: string }[] }[];
}

const pathOf = (at: string): string => String(at).split(':')[0];

/** The set of repository files a citation list names. */
export function citedFiles(cites: readonly Cite[] | undefined): Set<string> {
  return new Set((cites ?? []).map((c) => pathOf(c.at)).filter((p) => p.length > 0));
}

/** |A ∩ B| / |A ∪ B|, and 0 when both are empty, so an empty pair never wins. */
export function jaccard(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let both = 0;
  for (const x of a) if (b.has(x)) both += 1;
  return both / (a.size + b.size - both);
}

/**
 * Reading 1's mapping, computed and never chosen. Ties break on the part id so
 * the answer is the same on two machines, and a zero overlap maps to null.
 */
/**
 * The file set a part is mapped on.
 *
 * The spec asks for the part's ANCHOR file set, and `ArchSemanticResult`
 * carries no such field: a reading is claims and citations, and the anchors
 * live on the map. So when a caller hands `files` it is used, and otherwise
 * the part's own CITED files stand in for it. That substitution is stated in
 * the output as `anchorFrom`, because a metric computed off a different set
 * than the one the spec named has to say so rather than read as the same
 * number.
 */
export function partFiles(part: {
  files?: string[];
  claims?: { cites?: Cite[]; citations?: Cite[] }[];
}): Set<string> {
  if (Array.isArray(part.files) && part.files.length > 0) return new Set(part.files);
  const out = new Set<string>();
  for (const claim of part.claims ?? []) {
    for (const f of citedFiles(claim.cites ?? claim.citations)) out.add(f);
  }
  return out;
}

export function mapComponents(
  hand: readonly HandComponent[],
  parts: readonly {
    id: string;
    files?: string[];
    claims?: { cites?: Cite[]; citations?: Cite[] }[];
  }[]
): { componentId: string; partId: string | null; overlap: number }[] {
  return hand.map((c) => {
    const want = citedFiles(c.facts);
    let best: { partId: string | null; overlap: number } = { partId: null, overlap: 0 };
    for (const part of [...parts].sort((x, y) => (x.id < y.id ? -1 : x.id > y.id ? 1 : 0))) {
      const score = jaccard(want, partFiles(part));
      if (score > best.overlap) best = { partId: part.id, overlap: score };
    }
    return { componentId: c.id, ...best };
  });
}

/** Reading 2, per mapped pair: how much of what the person cited the model also cited. */
export function citationOverlap(handFiles: ReadonlySet<string>, modelFiles: ReadonlySet<string>): number {
  if (handFiles.size === 0) return 0;
  let both = 0;
  for (const f of handFiles) if (modelFiles.has(f)) both += 1;
  return both / handFiles.size;
}

/** The length of the longest common subsequence of two id sequences. */
export function lcs(a: readonly string[], b: readonly string[]): number {
  const table: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      table[i][j] = a[i - 1] === b[j - 1] ? table[i - 1][j - 1] + 1 : Math.max(table[i - 1][j], table[i][j - 1]);
    }
  }
  return table[a.length][b.length];
}

export function agree(hand: HandPass, reading: Reading): Record<string, unknown> {
  const parts = reading.parts ?? [];
  const mapping = mapComponents(hand.components, parts);
  const byComponent = new Map(mapping.map((m) => [m.componentId, m.partId]));
  const partById = new Map(parts.map((p) => [p.id, p]));

  const overlaps = mapping.map((m) => {
    const component = hand.components.find((c) => c.id === m.componentId);
    const part = m.partId === null ? undefined : partById.get(m.partId);
    const modelFiles = new Set<string>();
    for (const claim of part?.claims ?? []) {
      for (const f of citedFiles(claim.cites ?? claim.citations)) modelFiles.add(f);
    }
    return {
      componentId: m.componentId,
      partId: m.partId,
      anchorOverlap: Number(m.overlap.toFixed(4)),
      citationOverlap: Number(citationOverlap(citedFiles(component?.facts), modelFiles).toFixed(4))
    };
  });
  const mean = overlaps.length === 0 ? 0 : overlaps.reduce((a, o) => a + o.citationOverlap, 0) / overlaps.length;
  const anchorFrom = parts.some((p) => Array.isArray(p.files) && p.files.length > 0)
    ? 'the parts own anchor file sets'
    : 'the files each part CITED, because the reading carries no anchor set';

  const journeys = hand.journeys.map((j) => {
    const handIds = j.steps.map((s) => byComponent.get(s.componentId) ?? `unmapped:${s.componentId}`);
    let best = { journeyId: null as string | null, agreed: 0 };
    for (const mj of reading.journeys ?? []) {
      const got = lcs(handIds, (mj.steps ?? []).map((s) => s.partId));
      if (got > best.agreed) best = { journeyId: mj.id, agreed: got };
    }
    return { handJourneyId: j.id, steps: j.steps.length, ...best, fraction: j.steps.length === 0 ? 0 : Number((best.agreed / j.steps.length).toFixed(4)) };
  });

  return {
    mapping: overlaps,
    unmapped: mapping.filter((m) => m.partId === null).map((m) => m.componentId),
    anchorFrom,
    meanCitationOverlap: Number(mean.toFixed(4)),
    journeys
  };
}

// ---------------------------------------------------------------------------

function selfTest(): void {
  const problems: string[] = [];
  const eq = (what: string, got: unknown, want: unknown): void => {
    if (JSON.stringify(got) !== JSON.stringify(want)) problems.push(`${what}: got ${JSON.stringify(got)}, wanted ${JSON.stringify(want)}`);
  };
  eq('jaccard of two empty sets is 0, so an empty pair never wins', jaccard(new Set(), new Set()), 0);
  eq('jaccard', Number(jaccard(new Set(['a', 'b']), new Set(['b', 'c'])).toFixed(4)), 0.3333);
  eq('citationOverlap over an empty hand set', citationOverlap(new Set(), new Set(['a'])), 0);
  eq('citationOverlap', citationOverlap(new Set(['a', 'b']), new Set(['b'])), 0.5);
  eq('lcs keeps order', lcs(['a', 'b', 'c'], ['a', 'c']), 2);
  eq('lcs refuses a reversed sequence', lcs(['a', 'b', 'c'], ['c', 'b', 'a']), 1);

  const hand: HandPass = {
    components: [
      { id: 'sessions', name: 'S', facts: [{ at: 'src/a.ts:1' }, { at: 'src/b.ts:2' }] },
      { id: 'nothing', name: 'N', facts: [{ at: 'nowhere/z.ts:9' }] }
    ],
    journeys: [{ id: 'j', steps: [{ componentId: 'sessions' }, { componentId: 'sessions' }] }]
  };
  const reading: Reading = {
    parts: [
      { id: 'src', files: ['src/a.ts', 'src/b.ts'], claims: [{ field: 'does', citations: [{ at: 'src/a.ts:4' }] }] },
      { id: 'build', files: ['build/x.mjs'], claims: [] }
    ],
    journeys: [{ id: 'm', steps: [{ partId: 'src' }, { partId: 'build' }] }]
  };
  const out = agree(hand, reading) as any;
  eq('a hand component with no overlap is UNMAPPED rather than forced', out.unmapped, ['nothing']);
  eq('the mapping is computed', out.mapping[0].partId, 'src');
  eq('reading 2 is half: the model cited one of the two files the person did', out.mapping[0].citationOverlap, 0.5);
  eq('reading 3', out.journeys[0].agreed, 1);

  if (problems.length > 0) {
    for (const p of problems) process.stderr.write(`[p259-agree] SELF-TEST FAIL: ${p}\n`);
    process.exit(1);
  }
  process.stdout.write('[p259-agree] self-test OK: 10 graders behaved, nothing was read and nothing was launched\n');
}

function main(): void {
  const argv = process.argv.slice(2);
  if (argv.includes('--self-test')) {
    selfTest();
    return;
  }
  const readingPath = argv.find((a) => !a.startsWith('--'));
  if (readingPath === undefined) {
    process.stderr.write('usage: tsx build/p259/agree.mts <reading.json> [--hand <pass.json>] [--out <file>]\n');
    process.exit(2);
  }
  const handPath = argv.includes('--hand') ? argv[argv.indexOf('--hand') + 1] : 'build/p256/semantic/tortie.pass.json';
  const out = agree(
    JSON.parse(readFileSync(handPath, 'utf8')) as HandPass,
    JSON.parse(readFileSync(readingPath, 'utf8')) as Reading
  );
  const text = `${JSON.stringify(out, null, 2)}\n`;
  if (argv.includes('--out')) writeFileSync(argv[argv.indexOf('--out') + 1], text);
  process.stdout.write(text);
}

main();
