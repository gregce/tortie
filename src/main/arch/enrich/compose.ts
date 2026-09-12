/**
 * The enrichment prompt (Phase 158).
 *
 * One composer, pure. It is handed the drafted contract exactly as the writer
 * will write it, plus the measured facts, and it returns the prompt and the
 * FACT BLOCK as two strings. The fact block travels separately because the
 * validator's invented number rule is checked against it: every digit run in
 * a prose field the model wrote must appear verbatim in the fact block, or
 * the whole answer is refused. A field returned byte identical to the draft
 * is not one the model wrote, and it is exempt. A prompt asks; the
 * validator decides.
 *
 * This is deliberately NOT the fold's composer. The fold composes turns under
 * a 16 KB cap; this composes a whole drafted contract plus facts, so it has
 * its own, larger cap. The three real drafts the spec measured were 3.1 to
 * 5.4 KB before facts, so 64 KB leaves room for the fact block of a large
 * repository, and the file samples are what shrink when it does not fit.
 *
 * THE MAP BINDING IS ENFORCED IN THE INSTRUCTION AND AGAIN IN THE VALIDATOR.
 * The model is told to enrich IN PLACE, keeping every component id and every
 * anchor, and to put any regrouping into a separate suggestions list. The
 * validator refuses an answer that drops or invents an id or an anchor, so
 * the instruction is a courtesy and the refusal is the rule.
 */

import type { ArchDocument, ArchDrift } from '@shared/arch';
import { ARCH_PROMISE_GUIDANCE } from '@shared/arch';
import { componentFiles } from '../checkers/glob';
import { oneLine } from '../payload';
import {
  aggregateGroupEdges,
  mergeToTarget,
  partModules,
  rankGroups,
  type Group
} from '../skeleton';
import {
  ARCH_SEMANTIC_FACT_LINES,
  ARCH_SEMANTIC_FILE_SAMPLE,
  ARCH_SEMANTIC_JOURNEY_LINES,
  journeyFactsBlock,
  partFactsBlock,
  type ArchSemanticFactInput
} from '../semantic/block';

/** The whole composed prompt's ceiling, in bytes of UTF-8. */
export const ARCH_ENRICH_PROMPT_MAX_BYTES = 65_536;

/** How many file paths one part's fact lines sample, before the cap shrinks it. */
export const ARCH_ENRICH_FILE_SAMPLE = 40;

/**
 * The instruction the model answers under. Every line is a rule the
 * validator in ./validate.ts enforces mechanically after the answer comes
 * back, except the writing guidance, which is what the pass exists for.
 */
export const ARCH_ENRICH_SYSTEM_PROMPT = [
  'You improve a drafted architecture contract for a software repository.',
  'Answer with ONE JSON object and nothing else, in the shape',
  '{"contract": {...}, "components": [{...}], "edges": {"edges": [{...}]}, "suggestions": ["..."]}.',
  'Keep every component id and every anchor exactly as drafted. Never add a component and never remove one.',
  'Never change a component\'s kind, and never change the contract\'s subject, version or layers.',
  'Edit each component\'s name into a person readable name, and write one or two sentences of description saying what the part is FOR.',
  'Write real gaps where a part owes something, as plain sentences in its gaps list.',
  'Judge the promises in edges. Keep a may that is only an observation, promote one to must where the dependency is the design, and add a must-not between drafted parts where an import must never happen. Edge from and to only ever name drafted component ids.',
  'A promise you add is one JSON object shaped {"id": "...", "from": "...", "to": "...", "kind": "imports", "rule": "must-not", "checker": "imports", "evidence": []}: id is a new kebab case name such as app-must-not-import-store, kind names the verb, rule is must, may or must-not, and checker is imports for an import promise.',
  'Where FACTS lists imports between finer parts inside one drafted part, treat them as the real structure the drafted grain hides: let them ground that part\'s description and gaps, the promises you judge, and the regroupings you suggest.',
  'When no import crosses two drafted parts, that quiet boundary is still a promise to judge: where the design means the import never happens, such as parts that talk only over a network or a directory nothing may reach into, write that must-not. An empty promise list is only right when no boundary is worth keeping.',
  'Return every evidence list exactly as given, or with rows removed. Never add a quote and never quote code.',
  'Write a number only if that exact number appears in the FACTS section.',
  'If the parts should be grouped differently, say so in suggestions as plain sentences. Never reshape the answer itself.',
  'Do not write a baseline and do not accept any divergence.',
  'Do not use a dash of any kind. Use a colon only to introduce a list.'
].join('\n');

/**
 * The instruction a DRIFT repair answers under (Phase 159). Its own text,
 * NOT the whole instruction with two lines added: the first real run of the
 * fix round proved that Claude Haiku, told first to "edit each component's
 * name" and then to "change only the parts named in DRIFT", did the first,
 * and the validator refused the answer outside-drift. So this asks for the
 * repair and nothing else. Every line is a rule the validator enforces
 * mechanically (rules 4, 5, 6, 8 and 10 in ./validate.ts), except the two
 * sentences saying what a repair looks like, which is what the pass is for.
 * The instruction is a courtesy and the refusal is the rule.
 */
export const ARCH_DELTA_SYSTEM_PROMPT = [
  'You repair an architecture contract for a software repository after some of its promises drifted from the code.',
  'Answer with ONE JSON object and nothing else, in the shape',
  '{"contract": {...}, "components": [{...}], "edges": {"edges": [{...}]}, "suggestions": ["..."]}.',
  'Return the contract exactly as given. Return every part and every promise that DRIFT does not name exactly as given, every field and every quote included.',
  'Change only the parts and promises DRIFT names. Keep every id, every anchor, every kind and every checker exactly as given, keep every part in its layer with its provenance, its boundary and its deprecated flag as given, and keep every promise between the same two parts. Never add a part or a promise and never remove one.',
  'Where a promise broke, either change its rule to what the code now does, or keep the rule and add one gap sentence to the part that broke it saying what has to change in the code.',
  'Where a part fell behind or a quote no longer reads as written, bring that part\'s description and gaps up to date and drop the stale quote. Never add a quote and never quote code.',
  'Write a number only if that exact number appears in the DRIFT or FACTS section, or you are returning text exactly as it was given.',
  'If the parts should be grouped differently, say so in suggestions as plain sentences. Never reshape the answer itself.',
  'Do not write a baseline and do not accept any divergence.',
  'Do not use a dash of any kind. Use a colon only to introduce a list.'
].join('\n');

/** One resolved import, both ends tracked files. */
export interface ArchEnrichImport {
  fromPath: string;
  toPath: string;
}

/** Everything the composer sees. Every field comes from the fact base. */
export interface ArchEnrichComposeInput {
  /** The drafted or current contract the model enriches in place. */
  document: ArchDocument;
  /** Every tracked path at HEAD. */
  trackedFiles: readonly string[];
  /** Every resolved first party import. */
  imports: readonly ArchEnrichImport[];
}

export interface ArchEnrichComposition {
  /** The prompt text, ready to hand to the recipe. */
  prompt: string;
  /**
   * The FACTS section alone, byte for byte as it sits inside the prompt.
   * The validator's invented number rule reads this and nothing else.
   */
  factBlock: string;
  /** How many sampled file paths each part's fact lines ended up carrying. */
  fileSample: number;
}

/** The drafted contract as the model reads it: the same JSON the writer writes. */
function toText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Which component owns each tracked file, by the same anchors the map's
 * overlay matches. A file no anchor matches has no owner and contributes no
 * fact line.
 */
function ownerOf(
  document: ArchDocument,
  trackedFiles: readonly string[]
): Map<string, string> {
  const owner = new Map<string, string>();
  const ordered = [...document.components].sort((a, b) =>
    a.id < b.id ? -1 : 1
  );
  for (const component of ordered) {
    for (const path of componentFiles(component, trackedFiles)) {
      if (!owner.has(path)) owner.set(path, component.id);
    }
  }
  return owner;
}

/**
 * The deepest directory every path in the list shares, or the empty string
 * when they share none. Order independent, because a common prefix is.
 */
function commonDir(paths: readonly string[]): string {
  let prefix: string[] | null = null;
  for (const path of paths) {
    const dirs = path.split('/').slice(0, -1);
    if (prefix === null) {
      prefix = dirs;
      continue;
    }
    let i = 0;
    while (i < prefix.length && i < dirs.length && prefix[i] === dirs[i]) {
      i += 1;
    }
    prefix.length = i;
  }
  return (prefix ?? []).join('/');
}

/**
 * The crossings the map actually draws when a part is drilled (Phase 179).
 *
 * On a repository whose first party code sits under one top level directory,
 * every resolved import reads from === to at the drafted grain, the block
 * below says "none resolved", and the model is asked for five to ten
 * promises in the same breath. Research 71 section 3.2 measured the gap on
 * rookery: zero crossings over the nine drafted parts, 105 over the finer
 * decomposition inside the one `server` part. The drilled map was drawing
 * that graph all along, so this hands the SAME picture to the pass: the
 * part's owned files are subdivided by the drill's own rule (`partModules`
 * in ../skeleton.ts, one rule, two readers), and the imports between those
 * finer parts are printed as fact lines the model may quote.
 *
 * The lines are capped at the file sample and shrink with it under the byte
 * cap, with the leftover counted, so a large part stays honest at any size.
 * A part with fewer than two finer parts, or with no import between them,
 * contributes nothing.
 */
function finerPartLines(
  componentId: string,
  owned: readonly string[],
  imports: readonly ArchEnrichImport[],
  sample: number
): string[] {
  if (owned.length < 2) return [];
  const inside = new Set(owned);
  const interior = imports.filter(
    (edge) => inside.has(edge.fromPath) && inside.has(edge.toPath)
  );
  if (interior.length === 0) return [];
  const part: Group = {
    id: componentId,
    dir: commonDir(owned),
    files: [...owned]
  };
  const sub = partModules(part);
  if (sub.length < 2) return [];
  const modules = mergeToTarget(sub, rankGroups(sub, interior));
  const dirOf = new Map(modules.map((module) => [module.id, module.dir]));
  const crossings = aggregateGroupEdges(modules, interior);
  if (crossings.length === 0) return [];
  const lines = [`inside part ${componentId}, imports between its finer parts:`];
  for (const edge of crossings.slice(0, sample)) {
    lines.push(
      `  ${dirOf.get(edge.from) ?? edge.from} imports ` +
        `${dirOf.get(edge.to) ?? edge.to}: ${edge.count} ` +
        `${edge.count === 1 ? 'time' : 'times'}`
    );
  }
  if (crossings.length > sample) {
    lines.push(`  and ${crossings.length - sample} more`);
  }
  return lines;
}

/**
 * The FACTS section, deterministic for the same inputs.
 *
 * With a scope, only the parts in it get file lines and only the import
 * pairs with an end in it are counted, and the promise count guidance is
 * left out because a repair is not drafting promises. The tracked file count
 * always travels, so the block is never empty. Since Phase 179 each listed
 * part also carries the imports between its own finer parts, subdivided by
 * the drilled map's rule, so a part that swallows every crossing at the
 * drafted grain still hands the model its real structure.
 */
function factsBlock(
  input: ArchEnrichComposeInput,
  sample: number,
  scope: ReadonlySet<string> | null
): string {
  const lines: string[] = ['FACTS'];
  lines.push(`tracked files at HEAD: ${input.trackedFiles.length}`);
  const owner = ownerOf(input.document, input.trackedFiles);

  const files = new Map<string, string[]>();
  for (const [path, id] of owner) {
    const list = files.get(id);
    if (list === undefined) files.set(id, [path]);
    else list.push(path);
  }

  const components = [...input.document.components]
    .filter((component) => scope === null || scope.has(component.id))
    .sort((a, b) => (a.id < b.id ? -1 : 1));
  for (const component of components) {
    const owned = (files.get(component.id) ?? []).sort();
    lines.push(
      `part ${component.id}: anchors ${component.anchors.join(', ')}, ` +
        `${owned.length} files`
    );
    for (const path of owned.slice(0, sample)) {
      lines.push(`  ${path}`);
    }
    if (owned.length > sample) {
      lines.push(`  and ${owned.length - sample} more`);
    }
  }

  const counted = new Map<string, number>();
  for (const edge of input.imports) {
    const from = owner.get(edge.fromPath);
    const to = owner.get(edge.toPath);
    if (from === undefined || to === undefined || from === to) continue;
    if (scope !== null && !scope.has(from) && !scope.has(to)) continue;
    const key = `${from} imports ${to}`;
    counted.set(key, (counted.get(key) ?? 0) + 1);
  }
  lines.push('imports between parts:');
  const pairs = [...counted.entries()].sort((a, b) =>
    a[0] < b[0] ? -1 : 1
  );
  if (pairs.length === 0) lines.push('  none resolved');
  for (const [key, count] of pairs) {
    lines.push(`  ${key}: ${count} ${count === 1 ? 'time' : 'times'}`);
  }
  // Phase 179: the crossings the map actually draws. The scoped `components`
  // list is reused whole, so a repair's facts stay scoped to the drifted
  // parts the way the file lines already are.
  for (const component of components) {
    const owned = (files.get(component.id) ?? []).sort();
    lines.push(...finerPartLines(component.id, owned, input.imports, sample));
  }
  if (scope === null) {
    lines.push(
      `a healthy contract starts with ${ARCH_PROMISE_GUIDANCE.min} to ` +
        `${ARCH_PROMISE_GUIDANCE.max} promises`
    );
  }
  lines.push('END FACTS');
  return lines.join('\n');
}

/**
 * The DRIFT section: one line per broken promise with its open offences
 * indented under it, one line per stale quote, one line per part that fell
 * behind. Every value is a fact the checkers measured or a line the contract
 * holds, passed through `oneLine` so a specifier read out of somebody's
 * source cannot carry a control character into a prompt. The reader already
 * sorted everything, so the same drift is the same bytes.
 */
function driftBlock(drift: ArchDrift): string {
  const lines: string[] = ['DRIFT'];
  for (const promise of drift.promises) {
    lines.push(`promise ${promise.subjectId}: broke, ${oneLine(promise.reason)}`);
    for (const row of promise.offending) {
      lines.push(`  ${oneLine(row.fromPath)}:${String(row.line)} ${oneLine(row.specifier)}`);
    }
  }
  for (const quote of drift.quotes) {
    const where = `${oneLine(quote.path)}:${String(quote.line)}`;
    const holder = `${quote.owner.kind} ${quote.owner.id}`;
    lines.push(
      quote.status === 'absent'
        ? `quote ${where} in ${holder}: the file is gone`
        : `quote ${where} in ${holder} no longer reads "${oneLine(quote.quote)}"`
    );
  }
  for (const part of drift.parts) {
    lines.push(`part ${part.componentId}: ${String(part.commitsBehind)} commits behind`);
  }
  lines.push('END DRIFT');
  return lines.join('\n');
}

/**
 * The three sentences that introduce the contract's three pieces. The whole
 * pass says "drafted", because the skeleton drafted them a moment ago; a
 * repair says "current", because a person has been keeping them.
 */
interface ArchPromptWording {
  contract: string;
  parts: string;
  promises: string;
}

const WHOLE_WORDING: ArchPromptWording = {
  contract: 'Here is the drafted contract.',
  parts: 'Here are the drafted parts, one JSON object each.',
  promises: 'Here are the drafted promises.'
};

const DELTA_WORDING: ArchPromptWording = {
  contract: 'Here is the current contract.',
  parts: 'Here are the parts, one JSON object each.',
  promises: 'Here are the promises.'
};

/**
 * The one prompt shape, for the whole pass and the repair alike: the
 * contract, every part sorted by id, every promise, the fact block exactly
 * as the validator will read it, and the ask. Only the wording and the fact
 * block differ between the two, and both are handed in.
 */
function assemble(
  document: ArchDocument,
  factBlock: string,
  wording: ArchPromptWording
): string {
  const parts = [...document.components]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((component) => toText(component))
    .join('\n');
  return [
    wording.contract,
    '',
    toText(document.contract),
    wording.parts,
    '',
    parts,
    wording.promises,
    '',
    toText({ edges: document.edges }),
    factBlock,
    '',
    'Answer with the one JSON object.'
  ].join('\n');
}

/**
 * Build under the cap. When the composed text is over it, the file samples
 * shrink first, because the contract itself must always travel whole: an
 * answer is validated against it byte for byte, so sending half of it would
 * make every honest answer a refusal.
 */
function composeUnderCap(
  build: (sample: number) => { prompt: string; factBlock: string }
): ArchEnrichComposition {
  let sample = ARCH_ENRICH_FILE_SAMPLE;
  let built = build(sample);
  while (
    Buffer.byteLength(built.prompt, 'utf8') > ARCH_ENRICH_PROMPT_MAX_BYTES &&
    sample > 0
  ) {
    sample = sample > 8 ? Math.floor(sample / 2) : sample - 1;
    built = build(sample);
  }
  return { prompt: built.prompt, factBlock: built.factBlock, fileSample: sample };
}

/** Build the whole pass's prompt: the contract, every part's facts, and the guidance. */
export function composeArchEnrichPrompt(
  input: ArchEnrichComposeInput
): ArchEnrichComposition {
  return composeUnderCap((sample) => {
    const factBlock = factsBlock(input, sample, null);
    return { prompt: assemble(input.document, factBlock, WHOLE_WORDING), factBlock };
  });
}

/** The whole composer's input plus the drift the reader found. */
export interface ArchDeltaComposeInput extends ArchEnrichComposeInput {
  drift: ArchDrift;
}

/**
 * Build the DRIFT prompt (Phase 159). Narrower than the whole prompt in its
 * facts, never in its contract: every part and every promise still travels,
 * because the validator compares the answer against the whole draft and an
 * answer must carry every part to be kept. What is narrowed is the FACTS
 * block, scoped to the drifted parts, plus the DRIFT block that names what is
 * wrong and nothing else. Both blocks are measured facts, so both feed the
 * invented number rule: a gap sentence that repeats a line number or a
 * commit count from DRIFT is repeating a fact, not inventing one. They sit
 * in the prompt exactly as they sit in the fact block, one newline apart.
 * The same cap and the same shrink rule apply.
 */
export function composeArchDeltaPrompt(
  input: ArchDeltaComposeInput
): ArchEnrichComposition {
  const scope = new Set(input.drift.componentIds);
  return composeUnderCap((sample) => {
    const factBlock = `${driftBlock(input.drift)}\n${factsBlock(input, sample, scope)}`;
    return { prompt: assemble(input.document, factBlock, DELTA_WORDING), factBlock };
  });
}

// ---------------------------------------------------------------------------
// The semantic ask (Phase 259, research 118 §7.1 and §7.8; SPEC §1)
// ---------------------------------------------------------------------------
//
// A THIRD QUESTION, with its own block and its own instruction. The Phase 158
// pass asks a model to enrich a whole drafted CONTRACT; this one asks what ONE
// rule P box is FOR, and a fourth ask asks how the boxes reach one another.
// Neither writes a byte of `docs/arch/`: what comes back lives in Tortie's own
// disposable `arch.db`, so `ARCH_ROW_KEYS` is untouched and a model's
// sentences can never become part of the format a person commits.
//
// The budget, the allocation and the block's own bytes are in
// ../semantic/block.ts, which is pure, and re-exported here so the gate and
// the composer name one constant each.

export {
  ARCH_SEMANTIC_CATEGORIES,
  ARCH_SEMANTIC_FACT_LINES,
  ARCH_SEMANTIC_FILE_SAMPLE,
  ARCH_SEMANTIC_JOURNEY_LINES,
  allocateFactLines
} from '../semantic/block';
export type {
  ArchSemanticCrossing,
  ArchSemanticFactInput,
  ArchSemanticPart
} from '../semantic/block';

/**
 * The instruction the PART ask answers under, and the bytes are identical for
 * both recipes: only whether it rides a flag or the head of the prompt
 * differs, and `foldPromptFor` in ../../overview/fold/spawn.ts already decides
 * that from the recipe's `systemPromptMode`.
 *
 * Every line is a rule `./validate.ts` enforces mechanically afterwards. The
 * two that are NOT are the writing guidance, which is what the pass is for.
 *
 * THE TEN WORDS IT REFUSES ARE THE EVIDENCE LEVELS. Four of them are ordinary
 * English, so the validator refuses them as a FIELD VALUE and never as a
 * search inside a sentence: "the app is composed of three parts" is honest
 * prose and refusing it would refuse good writing.
 */
export const ARCH_SEMANTIC_SYSTEM_PROMPT = [
  'You say what one part of a software repository is FOR, and every sentence you write names the evidence for it.',
  'Answer with ONE JSON object and nothing else, in the shape',
  '{"part": "<the part id you were given>", "claims": [{"field": "...", "text": "...", "facts": [{"at": "path:line", "why": "..."}]}], "gates": [{"id": "...", "question": "...", "answer": "...", "because": "...", "facts": [...]}]}.',
  'Write exactly seven claims, one for each field, in this order: name, receives, does, returns, runsIn, keeps, limit.',
  'name is a person readable name for the part by its job, at most sixty characters. receives is what comes in. does is what it does with it. returns is what goes out. runsIn is where it runs. keeps is what it holds on to. limit is where it stops or what it cannot do.',
  'Write each one as one or two plain sentences of at most two hundred and forty characters.',
  'Every claim names at least one fact and at most six. A fact is written "path:line" and is copied EXACTLY from a line of the FACTS section. why says in at most one hundred and twenty characters what that line shows.',
  'Write a gate for each place in FACTS where this part refuses, stops or guards something, at most twelve of them. answer is one of proceeds, stops, uncertain, detected. because is one or two plain sentences. Every gate names at least one fact.',
  'You have not read this repository. Everything you know about it is in the FACTS section, so never name a file, a line, a symbol or a number that is not there.',
  'Never write how sure you are, how well tested something is, or how far it is proven. Never write the words off repository, declared, composed, reached, tested, component tested, accepted live, implemented not shipped or outside this repo as an answer to anything. Tortie computes that itself and an answer that carries one is thrown away whole.',
  'Write a number only if that exact number appears in the FACTS section.',
  'Never quote code and never write markdown.',
  'Do not use a dash of any kind. Use a colon only to introduce a list.'
].join('\n');

/**
 * The instruction the JOURNEYS ask answers under.
 *
 * ITS OWN TEXT, not the instruction above with two lines added, for the reason
 * Phase 159 wrote beside `ARCH_DELTA_SYSTEM_PROMPT`: the first real run of
 * that fix round proved a model told first to do one thing and then to do
 * another does the first. So this asks for journeys and nothing else, and the
 * last four lines are the four above verbatim, because they are the four the
 * validator enforces on every answer whatever it was asked for.
 */
export const ARCH_JOURNEY_SYSTEM_PROMPT = [
  'You say how setup reaches a result in a software repository, and every step you write names the evidence for it.',
  'Answer with ONE JSON object and nothing else, in the shape',
  '{"journeys": [{"id": "...", "name": "...", "steps": [{"partId": "...", "label": "...", "facts": [{"at": "path:line", "why": "..."}]}]}]}.',
  'Write at most five journeys, each with at most eight steps, in the order the steps really happen.',
  'id is a short lower case name with hyphens between its words. name says what the journey is, in at most eighty characters. label says what happens at that step, in at most eighty characters.',
  'partId names a part from the PARTS list and nothing else.',
  'Every step names at least one fact and at most six. A fact is written "path:line" and is copied EXACTLY from a line of the FACTS section. why says in at most one hundred and twenty characters what that line shows.',
  'You have not read this repository. Everything you know about it is in the FACTS section, so never name a file, a line, a symbol or a number that is not there.',
  'Never write how sure you are, how well tested something is, or how far it is proven. Never write the words off repository, declared, composed, reached, tested, component tested, accepted live, implemented not shipped or outside this repo as an answer to anything. Tortie computes that itself and an answer that carries one is thrown away whole.',
  'Write a number only if that exact number appears in the FACTS section.',
  'Never quote code and never write markdown.',
  'Do not use a dash of any kind. Use a colon only to introduce a list.'
].join('\n');

/** One composed semantic ask, with both knobs the cap may have shrunk. */
export interface ArchSemanticComposition extends ArchEnrichComposition {
  /** How many fact lines the block ended up carrying. */
  factLines: number;
}

/**
 * Build under the same cap the Phase 158 pass uses, shrinking the FACT LINES
 * first and the file sample second.
 *
 * The fact lines come first because they are the expensive half: research 118
 * §7.8 measured a fact line at 88 bytes and a sampled path at about 40, so a
 * block that will not fit loses subjects before it loses the file list that
 * tells the model what the part even holds.
 */
function composeSemanticUnderCap(
  build: (factLines: number, fileSample: number) => { prompt: string; factBlock: string }
): ArchSemanticComposition {
  let factLines = ARCH_SEMANTIC_FACT_LINES;
  let fileSample = ARCH_SEMANTIC_FILE_SAMPLE;
  let built = build(factLines, fileSample);
  const over = (): boolean =>
    Buffer.byteLength(built.prompt, 'utf8') > ARCH_ENRICH_PROMPT_MAX_BYTES;
  while (over() && factLines > 0) {
    factLines = factLines > 8 ? Math.floor(factLines / 2) : factLines - 1;
    built = build(factLines, fileSample);
  }
  while (over() && fileSample > 0) {
    fileSample = fileSample > 8 ? Math.floor(fileSample / 2) : fileSample - 1;
    built = build(factLines, fileSample);
  }
  return { prompt: built.prompt, factBlock: built.factBlock, fileSample, factLines };
}

/** The one shape both semantic asks take: a head, the block, and the ask. */
function assembleSemantic(head: string, factBlock: string): string {
  return [head, '', factBlock, '', 'Answer with the one JSON object.'].join('\n');
}

/**
 * The PART ask, or null when the partition holds no such box.
 *
 * Null is an answer and never an exception: a box id can go stale between a
 * person pressing and main reading, and the runner refuses `no-part` rather
 * than guessing a neighbour.
 */
export function composeArchSemanticPrompt(
  input: ArchSemanticFactInput,
  partId: string
): ArchSemanticComposition | null {
  const part = input.parts.find((one) => one.id === partId);
  if (part === undefined) return null;
  const head = [
    'Here is the part, as this repository was partitioned.',
    '',
    toText({
      id: part.id,
      label: part.label,
      anchors: [...part.dirs].sort(),
      files: part.files.length,
      parsed: part.parsed,
      region: part.region
    }).trimEnd(),
    '',
    'Say what it is FOR.'
  ].join('\n');
  const built = composeSemanticUnderCap((factLines, fileSample) => {
    const factBlock = partFactsBlock(input, partId, factLines, fileSample) ?? '';
    return { prompt: assembleSemantic(head, factBlock), factBlock };
  });
  return built;
}

/** The JOURNEYS ask: every part's shape, the crossings, and the walks. */
export function composeArchJourneyPrompt(
  input: ArchSemanticFactInput
): ArchSemanticComposition {
  const head = [
    'Here are the parts of this repository, as it was partitioned.',
    '',
    toText(
      [...input.parts]
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .map((part) => ({
          id: part.id,
          label: part.label,
          anchors: [...part.dirs].sort(),
          files: part.files.length,
          region: part.region
        }))
    ).trimEnd(),
    '',
    'Say how setup reaches a result across them.'
  ].join('\n');
  return composeSemanticUnderCap((factLines) => {
    const factBlock = journeyFactsBlock(
      input,
      Math.max(0, Math.round((factLines / ARCH_SEMANTIC_FACT_LINES) * ARCH_SEMANTIC_JOURNEY_LINES))
    );
    return { prompt: assembleSemantic(head, factBlock), factBlock };
  });
}
