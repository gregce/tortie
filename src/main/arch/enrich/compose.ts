/**
 * The enrichment prompt (Phase 158).
 *
 * One composer, pure. It is handed the drafted contract exactly as the writer
 * will write it, plus the measured facts, and it returns the prompt and the
 * FACT BLOCK as two strings. The fact block travels separately because the
 * validator's invented number rule is checked against it: every digit run in
 * a prose field the model wrote back must appear verbatim in the fact block,
 * or the whole answer is refused. A prompt asks; the validator decides.
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

import type { ArchDocument } from '@shared/arch';
import { ARCH_PROMISE_GUIDANCE } from '@shared/arch';
import { componentFiles } from '../checkers/glob';

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
  'Leave every evidence list empty. Never quote code.',
  'Write a number only if that exact number appears in the FACTS section.',
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

/** The FACTS section, deterministic for the same inputs. */
function factsBlock(input: ArchEnrichComposeInput, sample: number): string {
  const lines: string[] = ['FACTS'];
  lines.push(`tracked files at HEAD: ${input.trackedFiles.length}`);
  const owner = ownerOf(input.document, input.trackedFiles);

  const files = new Map<string, string[]>();
  for (const [path, id] of owner) {
    const list = files.get(id);
    if (list === undefined) files.set(id, [path]);
    else list.push(path);
  }

  const components = [...input.document.components].sort((a, b) =>
    a.id < b.id ? -1 : 1
  );
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
  lines.push(
    `a healthy contract starts with ${ARCH_PROMISE_GUIDANCE.min} to ` +
      `${ARCH_PROMISE_GUIDANCE.max} promises`
  );
  lines.push('END FACTS');
  return lines.join('\n');
}

function assemble(input: ArchEnrichComposeInput, sample: number): {
  prompt: string;
  factBlock: string;
} {
  const factBlock = factsBlock(input, sample);
  const doc = input.document;
  const parts = [...doc.components]
    .sort((a, b) => (a.id < b.id ? -1 : 1))
    .map((component) => toText(component))
    .join('\n');
  const prompt = [
    'Here is the drafted contract.',
    '',
    toText(doc.contract),
    'Here are the drafted parts, one JSON object each.',
    '',
    parts,
    'Here are the drafted promises.',
    '',
    toText({ edges: doc.edges }),
    factBlock,
    '',
    'Answer with the one JSON object.'
  ].join('\n');
  return { prompt, factBlock };
}

/**
 * Build the prompt. When the composed text is over the cap, the file samples
 * shrink first, because the drafted contract itself must always travel whole:
 * an answer is validated against it byte for byte, so sending half of it
 * would make every honest answer a refusal.
 */
export function composeArchEnrichPrompt(
  input: ArchEnrichComposeInput
): ArchEnrichComposition {
  let sample = ARCH_ENRICH_FILE_SAMPLE;
  let built = assemble(input, sample);
  while (
    Buffer.byteLength(built.prompt, 'utf8') > ARCH_ENRICH_PROMPT_MAX_BYTES &&
    sample > 0
  ) {
    sample = sample > 8 ? Math.floor(sample / 2) : sample - 1;
    built = assemble(input, sample);
  }
  return { prompt: built.prompt, factBlock: built.factBlock, fileSample: sample };
}
