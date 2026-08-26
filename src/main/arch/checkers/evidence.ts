/**
 * The evidence checker (Phase 63, research 49 section 4.4 and fix 2).
 *
 * **It proves that every quoted span still exists at HEAD.** A person writes a
 * claim into the contract and quotes the code that backs it. This checker
 * reads the file at HEAD and asks whether the quote is still in it.
 *
 * ## Against HEAD, never against the recorded blob
 *
 * This is research 49 fix 2 and it is the whole correctness of this checker. An
 * evidence row may carry `blobOid`, the object the quote was read from when it
 * was written. Checking the quote against THAT object is a check that can never
 * fail, because the object is immutable and the quote came out of it. So the
 * object name is kept for display, to answer "what did it look like when this
 * was written", and the check reads the file at the recorded path at HEAD.
 *
 * ## Transclusion, not paraphrase
 *
 * The test is a substring test on the file's bytes. It is not a fuzzy match, it
 * is not a line number comparison, and it does not repair a quote that drifted.
 * The line numbers are for jumping to, and they are re-verified against the
 * current bytes before any row draws, so a jump never lands on a line that no
 * longer exists.
 *
 * ## The coverage ceiling, again
 *
 * Evidence proves that the quoted code sits where the author said it sits. It
 * proves nothing about behaviour. So a behavioural promise backed by evidence
 * is `partly-checked` and says so in one sentence on its own face, and it never
 * becomes `checked` however much evidence is piled on it.
 */

import type { ArchEvidence } from '@shared/arch';
import type { ArchCheckerResult, ArchCheckerVerdict, ArchFactBase } from './facts';

/** The request `git cat-file --batch` is given for one evidence row. */
export function evidenceRequest(path: string): string {
  return `HEAD:${path}`;
}

/** Every path a document's evidence names, once each, in a stable order. */
export function evidencePaths(facts: {
  components: { evidence: ArchEvidence[] }[];
  edges: { evidence: ArchEvidence[] }[];
}): string[] {
  const out = new Set<string>();
  for (const component of facts.components) {
    for (const row of component.evidence) out.add(row.path);
  }
  for (const edge of facts.edges) {
    for (const row of edge.evidence) out.add(row.path);
  }
  return [...out].sort();
}

/**
 * Where the quote actually sits now, one based, or null when it is gone.
 *
 * The answer is the line the quote starts on, which is what the failure list
 * jumps to. A quote spanning several lines answers with its first line.
 */
export function quoteLine(text: string, quote: string): number | null {
  const at = text.indexOf(quote);
  if (at === -1) return null;
  let line = 1;
  for (let i = 0; i < at; i += 1) {
    if (text.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

/** Judge one quoted span. */
function checkRow(
  facts: ArchFactBase,
  ownerId: string,
  index: number,
  row: ArchEvidence
): ArchCheckerVerdict {
  const subjectId = `evidence:${ownerId}#${index}`;
  const text = facts.headBytes.get(row.path);
  if (text === undefined) {
    return {
      subjectId,
      status: 'unverifiable',
      coverage: 'unverifiable',
      reason:
        `The file this quote names was not read in this run, so the quote ` +
        `could not be checked. This is a gap in the run rather than an answer ` +
        `about the code.`
    };
  }
  if (text === null) {
    return {
      subjectId,
      status: 'absent',
      coverage: 'checked',
      reason:
        `${row.path} is not in the tree at HEAD, so the quote backing this ` +
        `claim has nowhere left to live.`
    };
  }
  const at = quoteLine(text, row.quote);
  if (at === null) {
    return {
      subjectId,
      status: 'divergent',
      coverage: 'checked',
      offending: [
        {
          fromPath: row.path,
          toPath: row.path,
          line: row.lineStart,
          specifier: row.quote
        }
      ],
      reason:
        `${row.path} no longer holds the quoted words. The claim they backed ` +
        `is now unbacked, and the words in the contract are what a person has ` +
        `to fix.`
    };
  }
  if (at !== row.lineStart) {
    return {
      subjectId,
      status: 'convergent',
      coverage: 'checked',
      offending: [
        {
          fromPath: row.path,
          toPath: row.path,
          line: at,
          specifier: row.quote
        }
      ],
      reason:
        `The quote still reads exactly as written, and it has moved from ` +
        `line ${row.lineStart} to line ${at}. Tortie jumps to where it is now.`
    };
  }
  return { subjectId, status: 'convergent', coverage: 'checked', reason: null };
}

/** Run the evidence checker over every quoted span in the document. */
export function checkEvidence(facts: ArchFactBase): ArchCheckerResult {
  const started = Date.now();
  const verdicts: ArchCheckerVerdict[] = [];
  for (const component of facts.components) {
    component.evidence.forEach((row, i) => {
      verdicts.push(checkRow(facts, `component:${component.id}`, i, row));
    });
  }
  for (const edge of facts.edges) {
    edge.evidence.forEach((row, i) => {
      verdicts.push(checkRow(facts, `edge:${edge.id}`, i, row));
    });
    if (edge.checker !== 'evidence') continue;
    const subjectId = `edge:${edge.id}`;
    if (edge.evidence.length === 0) {
      verdicts.push({
        subjectId,
        status: 'unverifiable',
        coverage: 'unverifiable',
        reason:
          `This promise is checked by its evidence and it carries none, so ` +
          `there is nothing to read it against.`
      });
      continue;
    }
    const rows = edge.evidence.map((row, i) => checkRow(facts, subjectId, i, row));
    const broken = rows.filter((r) => r.status === 'divergent' || r.status === 'absent');
    verdicts.push(
      broken.length > 0
        ? {
            subjectId,
            status: 'divergent',
            coverage: 'partly-checked',
            reason:
              `${broken.length} of the ${rows.length} quoted spans backing ` +
              `this promise no longer read as written. The quoted code is ` +
              `checked and the behaviour never is.`
          }
        : {
            subjectId,
            status: 'convergent',
            coverage: 'partly-checked',
            reason:
              `Every quoted span backing this promise still reads as written. ` +
              `That proves the code is where the author said it is, and it ` +
              `proves nothing about what happens when it runs.`
          }
    );
  }
  return { checker: 'evidence', verdicts, durationMs: Date.now() - started };
}
