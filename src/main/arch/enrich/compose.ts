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
