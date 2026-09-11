/**
 * The rule shapes of the fact base (Phase 257).
 *
 * A fact is a function of (bytes, path) and nothing else. A call rule reads
 * one call site the worker captured; a line rule reads one line of text; both
 * answer a SUBJECT or null, and the reader in `./read.ts` turns a subject into
 * an `ArchFactDraft` with the cited line as evidence. A rule states which
 * grammars it can answer for, and `'*'` means every grammar the worker parses,
 * so a rule naming one grammar is reported as answering for one.
 *
 * Nothing in a rule reads a file, spawns a process or names an argv. The
 * whole directory is pure in the sense `conformance:reading` rule 9 uses, and
 * `conformance:facts` rule 8 scans it to keep it that way.
 */

import type { ArchFactCategory } from '@shared/arch';
import type { ExtractedCall } from '../../symbols/extract';
import type { GrammarId } from '../../symbols/languages';

/** What a rule may ask about the file a call site sits in. */
export interface RuleContext {
  /** Repository relative path. */
  file: string;
  lang: GrammarId;
  /** Lower case basename. */
  base: string;
  /** Lower case directory path, '' at the root. */
  dir: string;
  /**
   * The whole file text. Two rules ask whether a crate is NAMED anywhere in
   * the file (research 118 §1.1: `Command::new` is both clap's and
   * `std::process`'s), and that question has no answer at a call site.
   */
  text: string;
}

/** One call shaped rule. */
export interface FactRule {
  readonly id: string;
  readonly category: ArchFactCategory;
  readonly kind: string;
  readonly langs: readonly GrammarId[] | '*';
  match(site: ExtractedCall, ctx: RuleContext): string | null;
}

/** One line shaped rule. */
export interface LineRule {
  readonly id: string;
  readonly category: ArchFactCategory;
  readonly kind: string;
  readonly langs: readonly GrammarId[] | '*';
  readonly re: RegExp;
  subject(
    m: RegExpExecArray,
    ctx: RuleContext,
    lines: readonly string[],
    index: number
  ): string | null;
}

/** Does a rule answer for this grammar? */
export function ruleReads(langs: readonly GrammarId[] | '*', lang: GrammarId): boolean {
  return langs === '*' || langs.includes(lang);
}
