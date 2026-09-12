/**
 * THE FACTS BLOCK (Phase 259, research 118 §7.8; SPEC §1).
 *
 * The one thing that bounds a model's answer is that it cannot read the
 * repository. Both shipped recipes run the child with its tools off and its
 * working directory inside Tortie's own fold home, so every citation it can
 * honestly make is one THIS BLOCK handed it, and a citation outside the block
 * was either copied off a sampled path or invented. That is what makes the
 * grader beside it worth running, and it is a different situation from
 * research 118 §6.4's 58.5%, which measures a careful human who HAD read the
 * source. The two numbers must never be compared as if they were one
 * experiment.
 *
 * ## The ask is PER PART, because the alternative does not fit
 *
 * §7.8 measured the whole-repository block at 163,229 bytes of distinct
 * subjects and its largest part alone at 78,439, against a 65,536 byte prompt
 * cap. So the block is one rule P box at a time, at about 120 fact lines, 10.3
 * KB and 2,600 tokens, and the journey ask gets one SUMMARY line per part
 * instead.
 *
 * ## `test` is not in it, and no claim may cite one
 *
 * Two reasons. The evidence rung is COMPUTED (Phase 258) and no model may
 * write one, so test facts feed nothing a model is allowed to claim; and
 * research 118 §6.4's `wrong-test` plant is exactly a citation of an unrelated
 * test that the checker misses, so handing over this repository's 15,784 test
 * facts is handing over 15,784 citations nothing can grade. It is also the
 * rule `arch:facts` already applies.
 *
 * ## No verdict of any kind is in it
 *
 * A model handed the word `tested` will write the word `tested`, and the
 * validator would then refuse the answer whole for a word the composer gave
 * it. The block carries facts and denominators and nothing else.
 *
 * ## Honest zeroes
 *
 * A category with no rows prints `none found by this reader` and is never
 * simply absent. A surface that says it found nothing is telling the truth
 * about the reader; a category silently missing is an invitation to invent
 * one.
 *
 * ## Deterministic
 *
 * Every ordering is total — category in the shared order, then kind, subject,
 * file, line — so reversing the input rows composes byte-identical bytes and
 * the same-input-hash refusal in the runner means something.
 */

import { ARCH_FACT_CATEGORIES } from '@shared/arch';
import type { ArchFact, ArchFactCategory } from '@shared/arch';

/**
 * Fact lines one part's block may carry. Research 118 §7.8 measured a fact
 * line at 88 bytes over the whole-repository block, so 120 lines is about
 * 10.3 KB and about 2,600 tokens.
 */
export const ARCH_SEMANTIC_FACT_LINES = 120;

/** Sampled file paths one part's block may carry, under the fact lines. */
export const ARCH_SEMANTIC_FILE_SAMPLE = 20;

/** Lines the journey ask's cross part summary may carry. */
export const ARCH_SEMANTIC_JOURNEY_LINES = 160;

/**
 * The seven admitted categories, DERIVED from the shared order minus `test`,
 * so the order of the answer's seven claims and the order of the block are one
 * decision and `test` cannot be re-admitted without moving the shared array.
 *
 * The order is also the order the answer is written in: what starts it, what
 * it exposes, what it keeps, what it reaches, where it stops.
 */
export const ARCH_SEMANTIC_CATEGORIES: readonly ArchFactCategory[] =
  ARCH_FACT_CATEGORIES.filter((category) => category !== 'test');

/** How many kind counts one part's summary line carries in the journey ask. */
const JOURNEY_KINDS_PER_PART = 6;

/**
 * How many crossing lines one part's block may carry.
 *
 * The quiet boundaries are drawn as ZEROES (see {@link partCrossings}), which
 * is two lines per other part, so a repository with hundreds of boxes would
 * spend the whole prompt on them. The real crossings are listed first and the
 * zeroes after, so what is cut is always the least informative half, and the
 * remainder is COUNTED rather than dropped in silence.
 */
const CROSSING_LINES = 60;

/** One rule P box, as the map's own partition draws it. */
export interface ArchSemanticPart {
  /** The map's own box id. */
  id: string;
  /** The label the map draws, which is what a person sees beside the answer. */
  label: string;
  /** The directories the box holds, for the `anchors` line. */
  dirs: readonly string[];
  /** Every tracked file in the box. */
  files: readonly string[];
  /** Of those, the ones this build parses. */
  parsed: number;
  /** The region the map draws it inside, or null. */
  region: string | null;
}

/** One aggregated crossing between two boxes. */
export interface ArchSemanticCrossing {
  from: string;
  to: string;
  count: number;
}

/** Everything the two composers see. Every field comes from the fact base. */
export interface ArchSemanticFactInput {
  /** Tracked files at HEAD, the denominator every part line is read against. */
  trackedFiles: number;
  parts: readonly ArchSemanticPart[];
  /** The seven admitted categories, whole repository. `test` never appears. */
  facts: readonly ArchFact[];
  crossings: readonly ArchSemanticCrossing[];
}

/**
 * Spread a line budget over the categories that have rows.
 *
 * Largest remainder over the distinct subject counts, then a FLOOR of four
 * lines for any category with any rows and a CEILING of half the budget for
 * any one category, then anything left over spent in the fixed order. This is
 * what stops `effect`, which holds 4,414 rows on this repository, eating
 * `gate`, which holds 815, and `network`, which holds 97.
 *
 * The ceiling binds only while another category can use the room: on a part
 * where one category is the only one with rows, spending half the budget and
 * throwing the rest away would be a worse answer than a full block.
 */
export function allocateFactLines(
  counts: readonly number[],
  budget: number
): number[] {
  const n = counts.length;
  const out = new Array<number>(n).fill(0);
  const total = counts.reduce((sum, one) => sum + one, 0);
  if (n === 0 || total === 0 || budget <= 0) return out;
  const floor = Math.min(4, budget);
  const cap = Math.max(1, Math.floor(budget / 2));

  // 1. Largest remainder, never past what a category actually holds.
  const raw = counts.map((count) => (count / total) * budget);
  let used = 0;
  for (let i = 0; i < n; i += 1) {
    out[i] = Math.min(counts[i] ?? 0, Math.floor(raw[i] ?? 0));
    used += out[i] ?? 0;
  }
  const byRemainder = raw
    .map((value, i) => ({ i, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of byRemainder) {
    if (used >= budget) break;
    if ((out[i] ?? 0) < (counts[i] ?? 0)) {
      out[i] = (out[i] ?? 0) + 1;
      used += 1;
    }
  }

  // 2. The floor, taken from the largest holder that stays at or over its own.
  for (let i = 0; i < n; i += 1) {
    if ((counts[i] ?? 0) === 0) continue;
    const want = Math.min(floor, counts[i] ?? 0);
    while ((out[i] ?? 0) < want) {
      let from = -1;
      for (let j = 0; j < n; j += 1) {
        if (j === i) continue;
        if ((out[j] ?? 0) <= Math.min(floor, counts[j] ?? 0)) continue;
        if (from === -1 || (out[j] ?? 0) > (out[from] ?? 0)) from = j;
      }
      if (from === -1) break;
      out[from] = (out[from] ?? 0) - 1;
      out[i] = (out[i] ?? 0) + 1;
    }
  }

  // 3. The ceiling, spilling into the next category in the fixed order that
  //    can hold it. Nowhere to spill means the ceiling does not bind.
  for (let i = 0; i < n; i += 1) {
    while ((out[i] ?? 0) > cap) {
      let to = -1;
      for (let step = 1; step < n; step += 1) {
        const j = (i + step) % n;
        if ((out[j] ?? 0) < (counts[j] ?? 0) && (out[j] ?? 0) < cap) {
          to = j;
          break;
        }
      }
      if (to === -1) break;
      out[i] = (out[i] ?? 0) - 1;
      out[to] = (out[to] ?? 0) + 1;
    }
  }

  // 4. Spend what is left, respecting the ceiling first and then without it,
  //    so a budget is never thrown away on a part with one busy category.
  used = out.reduce((sum, one) => sum + one, 0);
  for (const respectCap of [true, false]) {
    let moved = true;
    while (used < budget && moved) {
      moved = false;
      for (let i = 0; i < n && used < budget; i += 1) {
        if ((out[i] ?? 0) >= (counts[i] ?? 0)) continue;
        if (respectCap && (out[i] ?? 0) >= cap) continue;
        out[i] = (out[i] ?? 0) + 1;
        used += 1;
        moved = true;
      }
    }
  }
  return out;
}

/** One distinct subject with its citation and how many rows it stands for. */
interface SubjectRow {
  category: ArchFactCategory;
  kind: string;
  subject: string;
  file: string;
  line: number;
  count: number;
}

/**
 * Group a part's facts by `(category, kind, subject)`. The citation is the
 * SMALLEST `(file, line)` in sorted order and the rest are counted, which is
 * the shape research 118 §7.8 measured a prompt taking: 1,856 lines against
 * 7,224.
 */
function distinctSubjects(facts: readonly ArchFact[]): SubjectRow[] {
  const byKey = new Map<string, SubjectRow>();
  for (const fact of facts) {
    // JSON rather than a separator, because a subject may hold any
    // character at all and two rows must never collide on one.
    const key = JSON.stringify([fact.category, fact.kind, fact.subject]);
    const held = byKey.get(key);
    if (held === undefined) {
      byKey.set(key, {
        category: fact.category,
        kind: fact.kind,
        subject: fact.subject,
        file: fact.file,
        line: fact.line,
        count: 1
      });
      continue;
    }
    held.count += 1;
    if (fact.file < held.file || (fact.file === held.file && fact.line < held.line)) {
      held.file = fact.file;
      held.line = fact.line;
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
    if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1;
    if (a.file !== b.file) return a.file < b.file ? -1 : 1;
    return a.line - b.line;
  });
}

/**
 * The block for ONE part, or null when the partition holds no such box.
 *
 * Every fact line is `  <kind> <subject> at <file>:<line>` — the citation form
 * the answer must copy — so the grader's resolution is a copy rather than a
 * guess for every claim the block can back.
 */
export function partFactsBlock(
  input: ArchSemanticFactInput,
  partId: string,
  factLines: number,
  fileSample: number
): string | null {
  const part = input.parts.find((one) => one.id === partId);
  if (part === undefined) return null;
  const owned = new Set(part.files);
  const mine = input.facts.filter((fact) => owned.has(fact.file));
  const rows = distinctSubjects(mine);

  const perCategory = ARCH_SEMANTIC_CATEGORIES.map((category) =>
    rows.filter((row) => row.category === category)
  );
  const budget = allocateFactLines(
    perCategory.map((list) => list.length),
    factLines
  );

  const lines: string[] = [];
  lines.push(`PART ${part.id}`);
  lines.push(`anchors: ${part.dirs.length === 0 ? part.id : part.dirs.join(', ')}`);
  if (part.region !== null) lines.push(`region: ${part.region}`);
  lines.push(
    `files: ${String(part.files.length)} tracked of ${String(input.trackedFiles)} ` +
      `in this repository, ${String(part.parsed)} parsed`
  );
  lines.push('FACTS');
  ARCH_SEMANTIC_CATEGORIES.forEach((category, at) => {
    lines.push(category);
    const list = perCategory[at] ?? [];
    if (list.length === 0) {
      lines.push('  none found by this reader');
      return;
    }
    const take = budget[at] ?? 0;
    for (const row of list.slice(0, take)) {
      lines.push(`  ${row.kind} ${row.subject} at ${row.file}:${String(row.line)}`);
    }
    const left = list.length - take;
    if (left > 0) {
      lines.push(
        `  and ${String(left)} more ${left === 1 ? 'subject' : 'subjects'} ` +
          `this reader found and did not list`
      );
    }
  });
  lines.push('FILES');
  const sampled = [...part.files].sort();
  for (const path of sampled.slice(0, fileSample)) lines.push(`  ${path}`);
  if (sampled.length > fileSample) {
    lines.push(`  and ${String(sampled.length - fileSample)} more`);
  }
  lines.push('imports crossing this part:');
  const crossings = partCrossings(input, part.id);
  if (crossings.length === 0) lines.push('  none resolved');
  for (const line of crossings) lines.push(`  ${line}`);
  lines.push('END FACTS');
  return lines.join('\n');
}

/**
 * The journey ask's block: one summary line per part plus the crossings
 * between them. A journey is about how the parts reach one another, so the
 * facts it needs are the SHAPES of the parts rather than their rows.
 */
export function journeyFactsBlock(
  input: ArchSemanticFactInput,
  lineBudget: number
): string {
  const lines: string[] = ['PARTS'];
  const parts = [...input.parts].sort((a, b) => (a.id < b.id ? -1 : 1));
  const owners = new Map<string, string>();
  for (const part of parts) for (const file of part.files) owners.set(file, part.id);
  const kindCounts = new Map<string, Map<string, number>>();
  for (const fact of input.facts) {
    const owner = owners.get(fact.file);
    if (owner === undefined) continue;
    let held = kindCounts.get(owner);
    if (held === undefined) {
      held = new Map<string, number>();
      kindCounts.set(owner, held);
    }
    held.set(fact.kind, (held.get(fact.kind) ?? 0) + 1);
  }
  let spent = 0;
  for (const part of parts) {
    if (spent >= lineBudget) break;
    const kinds = [...(kindCounts.get(part.id) ?? new Map<string, number>()).entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, JOURNEY_KINDS_PER_PART)
      .map(([kind, count]) => `${String(count)} ${kind}`);
    lines.push(
      `  ${part.id}: ${String(part.files.length)} files` +
        (kinds.length === 0 ? ', no facts found by this reader' : `, ${kinds.join(', ')}`)
    );
    spent += 1;
  }
  lines.push('imports between parts:');
  const known = new Set(parts.map((part) => part.id));
  const crossings = [...input.crossings]
    .filter((edge) => known.has(edge.from) && known.has(edge.to) && edge.from !== edge.to)
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : a.to < b.to ? -1 : 1));
  if (crossings.length === 0) lines.push('  none resolved');
  for (const edge of crossings.slice(0, Math.max(0, lineBudget - spent))) {
    lines.push(`  ${edge.from} imports ${edge.to}: ${String(edge.count)} ${plural(edge.count)}`);
  }
  lines.push('END FACTS');
  return lines.join('\n');
}

/**
 * The crossings that touch one part, both directions, with the ZEROES drawn.
 *
 * A quiet boundary is a fact about the design and not an absence of one, which
 * is the rule the Phase 158 composer already applies to promises; a reader
 * that only ever sees the crossings that exist cannot tell a part that talks
 * to nothing from a part nobody looked at.
 */
function partCrossings(input: ArchSemanticFactInput, partId: string): string[] {
  const counted = new Map<string, number>();
  for (const edge of input.crossings) {
    if (edge.from === edge.to) continue;
    if (edge.from !== partId && edge.to !== partId) continue;
    counted.set(`${edge.from} imports ${edge.to}`, edge.count);
  }
  for (const other of input.parts) {
    if (other.id === partId) continue;
    for (const key of [`${partId} imports ${other.id}`, `${other.id} imports ${partId}`]) {
      if (!counted.has(key)) counted.set(key, 0);
    }
  }
  const ordered = [...counted.entries()].sort((a, b) => {
    // Real crossings first, then the quiet boundaries, then by name so the
    // bytes are the same for the same facts.
    const live = (count: number): number => (count > 0 ? 0 : 1);
    if (live(a[1]) !== live(b[1])) return live(a[1]) - live(b[1]);
    if (a[1] !== b[1]) return b[1] - a[1];
    return a[0] < b[0] ? -1 : 1;
  });
  const lines = ordered
    .slice(0, CROSSING_LINES)
    .map(([key, count]) => `${key}: ${String(count)} ${plural(count)}`);
  if (ordered.length > CROSSING_LINES) {
    lines.push(`and ${String(ordered.length - CROSSING_LINES)} more, all of them quiet`);
  }
  return lines;
}

function plural(count: number): string {
  return count === 1 ? 'time' : 'times';
}
