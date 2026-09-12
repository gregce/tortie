/**
 * THE FLOOR (Phase 259, research 118 §6.4 and §7.3; SPEC §2.5).
 *
 * A backing rate means nothing without the share the same files would give at
 * random, and here the floor is LARGE: a citation is backed when SOME row sits
 * within three lines of it, so the honest question is *what share of the lines
 * in these files are within three lines of some row anyway*. Measured over the
 * nineteen files the hand pass cites: **2.3% with call sites alone and 23.8%
 * once declarations are in**, of which 21.9 points are the declarations
 * themselves, because a prose-heavy TypeScript file declares something every
 * few lines. So "24 of 41 backed" without "and 10 of 41 would be anyway" is a
 * number without its denominator, which is the one thing this pane refuses to
 * do everywhere else.
 *
 * ## The per grade floors are PARTITIONED, not marginal
 *
 * Research 118 quotes marginal shares per category. This module answers the
 * question a chip actually raises, which is *what is the chance of getting
 * THIS grade by pointing at random*, so the four floors are computed under the
 * same precedence ../semantic/grade.ts applies and they sum to the line count.
 * `gate` is unaffected by the change, because a gate row wins over everything
 * and its partitioned share is its marginal one; what moves is `call-site`,
 * which loses the lines a gate row already took, and `declaration`, which
 * loses every line a fact of any kind took. That is the comparison a reader
 * needs: `declaration 15 of 41` beside `9 of 41 would be by chance` is a
 * sentence about the same event.
 *
 * ## It opens no file
 *
 * Line counts come from `arch_tree_file` (Phase 201) through the same seam the
 * grader reads, and the rows come from `arch_fact` and `arch_decl`. Every mark
 * is clamped to the file's own 1..n, so a row three lines from the top marks
 * three lines and not six.
 *
 * ## One slack
 *
 * `ARCH_CITE_SLACK` is imported from `@shared/arch`, the same constant the
 * grader reads, so an ablation of it moves the rate AND the floor together.
 * The prototype kept two copies on purpose so they could be ablated apart;
 * shipping two would be two answers to one question.
 */

import { ARCH_CITE_GRADES, ARCH_CITE_SLACK } from '@shared/arch';
import type { ArchCiteGrade } from '@shared/arch';
import { citeLineBound, type ArchGradeSources } from './grade';

/**
 * The floor over one file set. `within` of `lines` lines are within the slack
 * of an admitted row; `byGrade` splits `lines` four ways under the grader's
 * own precedence, so the four add up to `lines` and `within` is `lines` minus
 * the `resolves` share.
 */
export interface ArchCiteFloor {
  within: number;
  lines: number;
  byGrade: Record<ArchCiteGrade, number>;
}

/** An empty floor, for a scope that cites nothing at all. */
export function emptyCiteFloor(): ArchCiteFloor {
  const byGrade = {} as Record<ArchCiteGrade, number>;
  for (const grade of ARCH_CITE_GRADES) byGrade[grade] = 0;
  return { within: 0, lines: 0, byGrade };
}

/**
 * The floor over the files a reading actually cites, which is the number a
 * backing rate has to beat: a writer who had these files open and pointed at
 * random inside them scores it.
 *
 * A file the tree does not track contributes nothing at all, because a
 * citation into it could never have resolved either.
 */
export function citeFloor(
  files: readonly string[],
  src: ArchGradeSources
): ArchCiteFloor {
  const floor = emptyCiteFloor();
  for (const relPath of [...new Set(files)].sort()) {
    const newlines = src.lines(relPath);
    if (newlines === null) continue;
    const bound = citeLineBound(newlines);
    const gate = new Set<number>();
    const call = new Set<number>();
    const decl = new Set<number>();
    for (const row of src.facts(relPath)) {
      mark(row.category === 'gate' ? gate : call, row.line, bound);
    }
    for (const row of src.decls(relPath)) mark(decl, row.line, bound);
    let onGate = 0;
    let onCall = 0;
    let onDecl = 0;
    for (let line = 1; line <= bound; line += 1) {
      // The grader's own precedence, asked of a line rather than a citation.
      if (gate.has(line)) onGate += 1;
      else if (call.has(line)) onCall += 1;
      else if (decl.has(line)) onDecl += 1;
    }
    floor.byGrade.gate += onGate;
    floor.byGrade['call-site'] += onCall;
    floor.byGrade.declaration += onDecl;
    floor.byGrade.resolves += bound - onGate - onCall - onDecl;
    floor.within += onGate + onCall + onDecl;
    floor.lines += bound;
  }
  return floor;
}

/** Every line within the slack of one row, clamped to the file's own extent. */
function mark(into: Set<number>, line: number, bound: number): void {
  for (let at = line - ARCH_CITE_SLACK; at <= line + ARCH_CITE_SLACK; at += 1) {
    if (at >= 1 && at <= bound) into.add(at);
  }
}
