/**
 * The Context object model, as the sidebar view consumes it.
 *
 * SEAM 1, NOW CLOSED. This started as a local mirror of research 29 §4 so the
 * view could compile before the reader landed. `src/shared/context.ts` is now
 * in the tree, so this module is what §12 asked for: one import point, and the
 * types come from the shared module rather than from a second copy of them.
 * Everything under `src/renderer/context/**` imports from HERE, so if the
 * shared shapes move there is exactly one file to follow them in.
 *
 * WHAT THIS FILE ADDS on top of the re-exports: the four accessors below. The
 * shared model carries the per-category detail in a discriminated `payload`,
 * which is the right shape for a reader and the wrong shape for a row that has
 * to ask "what event is this hook on" without a switch at every call site.
 */

export type {
  ContextAgentReadout,
  ContextAgentVerdict,
  ContextCategory,
  ContextRowDrift,
  ContextEntry,
  ContextEvidence,
  ContextExecutable,
  ContextExecutableScan,
  ContextHashMode,
  ContextPayload,
  ContextPrecedenceModel,
  ContextPrecedenceReadout,
  ContextProblem,
  ContextReloadBehavior,
  ContextReloadCell,
  ContextResolution,
  ContextRootReadout,
  ContextScanInput,
  ContextScanResult,
  ContextScope,
  ContextSectionCount,
  ContextShadow,
  ContextState,
  HookPayload,
  InstructionPayload,
  McpPayload,
  PluginPayload,
  SkillPayload
} from '@shared/context';

export { CONTEXT_CATEGORIES, CONTEXT_SCOPE_LABEL } from '@shared/context';

import type { ContextEntry } from '@shared/context';
import type { ContextSnapshotEntry } from '@shared/context-snapshot';

/**
 * §2.1 — a vendor bundle (Cursor's `skills-cursor`, Codex's `skills/.system`).
 *
 * It is a SCOPE in the shared model rather than a flag, which is the better
 * shape: a bundled thing is not a project thing wearing a badge, it is a thing
 * that came from a different place. The view still asks the question often
 * enough to want one word for it.
 */
export function isBundled(entry: ContextEntry): boolean {
  return entry.scope === 'bundled';
}

/** The event a hook fires on, or null for anything that is not a hook. */
export function hookEvent(entry: ContextEntry): string | null {
  return entry.payload.kind === 'hook' ? entry.payload.event : null;
}

/** An instruction file's position in the concatenated load order. */
export function instructionOrder(entry: ContextEntry): number {
  return entry.payload.kind === 'instruction' ? entry.payload.order : 0;
}

/** The file whose `@import` pulled an instruction file in, when one did. */
export function instructionVia(entry: ContextEntry): string | null {
  return entry.payload.kind === 'instruction'
    ? entry.payload.importedBy
    : null;
}

/**
 * Fold a row down to the six fields the launch snapshot keeps.
 *
 * ONE FIELD NEEDS A DECISION and it is `hash`. The scan writes `string | null`
 * and the snapshot writes `string`, where the EMPTY STRING means "could not
 * hash this". Those are the same fact spelled two ways, so mapping null to ''
 * here is a translation and not a loss: `diffContextSnapshot` treats an empty
 * hash as "cannot tell" rather than as "unchanged", which is exactly what a
 * null hash means on the scan side.
 */
export function toSnapshotRow(entry: ContextEntry): ContextSnapshotEntry {
  return {
    id: entry.id,
    category: entry.category,
    name: entry.name,
    scope: entry.scope,
    sourcePath: entry.sourcePath,
    hash: entry.hash ?? ''
  };
}
