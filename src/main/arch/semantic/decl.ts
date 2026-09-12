/**
 * THE DECLARATION HALF (Phase 259, research 118 §6.4; SPEC §0 D5 and §3.1).
 *
 * A semantic claim's best evidence is usually a DECLARATION. "The one door
 * that rewrites your file" is evidenced by `export async function
 * writeGuarded(` at `src/main/fs/guarded-write.ts`, which is not a call site
 * and never will be one. Research 118 measured the hand pass's backing going
 * from 22.0% to 58.5% when declarations joined the base, so without them the
 * grader's best answer for the sharpest sentence a person can write is
 * `resolves`.
 *
 * ## It is NOT a ninth fact category, and that is the whole design of it
 *
 * `ARCH_FACT_CATEGORIES`, `ARCH_FACT_KINDS`, `arch:facts`,
 * `conformance:facts`'s recall scopes and the surfaces list do not move.
 * Declarations live in their own table, `arch_decl`, read by the grader and by
 * the floor and by NOTHING else: they never reach a rung, a count on a face, a
 * region or a disclosure. The reason is the floor. A declaration within three
 * lines beats chance by 2.46x where a call site beats it by 9.6x, and 21.9 of
 * the declaration base's 23.8 points of floor are the declarations themselves.
 * Folding them into the fact base would quietly make every count in this pane
 * a count over a much noisier signal.
 *
 * For the same reason the bound below is NOT in `FACT_LIMITS`: that table is
 * the rule table's own bound set, `conformance:facts` rule 15 drives it, and a
 * declaration is not a fact.
 *
 * ## The filter is the prototype's, ported verbatim
 *
 * `build/p256/det/run.mts:249` admits nine kinds and nothing else, and its own
 * comment says why: a semantic claim never cites a local helper, and every
 * definition in a thirty thousand file repository would drown the base. The
 * subject is `<kind> <container>.<name>`, which is what the drift fingerprint
 * compares, so a symbol that moved down a file stays the same subject and its
 * citation's line is rewritten rather than killed.
 *
 * Pure: no `node:`, no `electron`, no `child_process`, no `require(`. The
 * bytes it reads are the ones `tree-facts.ts` already read for the fact pass,
 * and the symbols are the ones the worker already put on the SAME message.
 */

import { ARCH_FACT_LIMITS } from '@shared/arch';

/**
 * The nine kinds the prototype admits. Every one is a definition a person
 * could reasonably point at in a sentence about what a part is FOR.
 */
export const ARCH_DECL_KINDS: readonly string[] = [
  'function',
  'method',
  'class',
  'interface',
  'type',
  'constant',
  'struct',
  'enum',
  'module'
];

/**
 * How many declarations one file may contribute.
 *
 * A bound rather than a judgement: research read about 29,900 declarations
 * across this repository's 2,500 parsed files, so 400 is two orders over the
 * ordinary file and is there to stop one generated or vendored monster filing
 * a table of its own. The overflow is COUNTED rather than dropped in silence.
 */
export const ARCH_DECL_MAX_PER_FILE = 400;

/** One symbol as the worker hands it back, narrowed to what this reader uses. */
export interface DeclSymbol {
  name: string;
  kind: string;
  container: string | null;
  /** 1 based. */
  line: number;
}

/** One declaration row, before it is keyed on the file's blob oid. */
export interface ArchDeclDraft {
  kind: string;
  /** `<kind> <container>.<name>`, cut at the fact base's own subject bound. */
  subject: string;
  line: number;
  /** The trimmed source line, cut at the fact base's own evidence bound. */
  evidence: string;
}

/** What one file's read produced: the rows, and how many did not fit. */
export interface ArchDeclRead {
  decls: ArchDeclDraft[];
  /** Admitted declarations past the per file bound. Zero for every ordinary file. */
  truncated: number;
}

/**
 * Read one file's declarations. Deterministic for the same inputs: the rows
 * come back sorted by line, then kind, then subject, so two runs over the same
 * bytes store the same rows in the same order whatever the parser's own order
 * was.
 */
export function readDecls(symbols: readonly DeclSymbol[], lines: readonly string[]): ArchDeclRead {
  const rows: ArchDeclDraft[] = [];
  for (const symbol of symbols) {
    if (!ARCH_DECL_KINDS.includes(symbol.kind)) continue;
    if (!Number.isInteger(symbol.line) || symbol.line < 1) continue;
    if (typeof symbol.name !== 'string' || symbol.name.length === 0) continue;
    const container =
      typeof symbol.container === 'string' && symbol.container.length > 0
        ? `${symbol.container}.`
        : '';
    const subject = `${symbol.kind} ${container}${symbol.name}`.slice(
      0,
      ARCH_FACT_LIMITS.maxSubject
    );
    rows.push({
      kind: symbol.kind,
      subject,
      line: symbol.line,
      evidence: (lines[symbol.line - 1] ?? '').trim().slice(0, ARCH_FACT_LIMITS.maxEvidence)
    });
  }
  rows.sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    if (a.kind !== b.kind) return a.kind < b.kind ? -1 : 1;
    if (a.subject !== b.subject) return a.subject < b.subject ? -1 : 1;
    return 0;
  });
  return {
    decls: rows.slice(0, ARCH_DECL_MAX_PER_FILE),
    truncated: Math.max(0, rows.length - ARCH_DECL_MAX_PER_FILE)
  };
}
