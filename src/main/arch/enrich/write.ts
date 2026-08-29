/**
 * The ONE place a contract file is written (Phase 158).
 *
 * ../load.ts is the one place a contract file is read, and this module is its
 * inverse, with the same discipline inverted: every path written is the
 * repository root joined with a COMPILED name from `ARCH_DIR`/`ARCH_FILES`,
 * or `components/<id>.json` where `<id>` has passed `ARCH_ID_PATTERN`. No
 * path from a model's answer, from a renderer, or from any configuration
 * ever reaches the filesystem, and `assertArchWritePath` re-checks every
 * plan entry at the write itself, so a caller that composed a path some other
 * way is refused rather than obeyed.
 *
 * WHY MAIN WRITES AT ALL NOW. The operator amended Phase 158 on 2026-08-27:
 * the pass writes `docs/arch/` DIRECTLY so the write lands as an ordinary
 * uncommitted change in Source Control, never unsaved buffers a person must
 * save. Source Control is the review surface, the repository's own watcher
 * fan out picks the write up with no new subscription, and nothing here
 * commits, stages or pushes.
 *
 * WHAT IS NEVER WRITTEN HERE. `baseline.json` has exactly one writer, being
 * {@link appendAcceptedDivergence}, and it runs only from the accept button's
 * own channel. The enrichment plan cannot name it: `planSkeletonWrite` skips
 * it and `planEnrichedWrite` never emits it, so the file's first writer is
 * always the person's own accept. The pass's validator refuses an answer
 * carrying baseline content before this module is ever reached.
 *
 * `npm run conformance:arch` holds the wall: this file is the only file under
 * `src/main/arch/` allowed to name `writeFile`, and the gate drives the plan
 * functions over hostile ids to prove the refusal bites.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import {
  ARCH_DIR,
  ARCH_FILES,
  ARCH_ID_PATTERN,
  ARCH_LIMITS,
  type ArchAcceptedRow,
  type ArchBaseline
} from '@shared/arch';
import { createArchFileSystem } from '../load';
import { parseArchJson, validateBaseline } from '../validate';
import { dayField, pathField, plainString, ArchRowError } from '../schema';
import type { SkeletonBuffer } from '../skeleton';
import type { ArchEnrichAnswer } from './validate';

const ID_RE = new RegExp(ARCH_ID_PATTERN);

/** One file the writer will write, path repository relative. */
export interface ArchWritePlanFile {
  path: string;
  text: string;
}

/** The compiled names a plan entry may carry. Everything else throws. */
export function assertArchWritePath(relativePath: string): void {
  const contract = `${ARCH_DIR}/${ARCH_FILES.contract}`;
  const edges = `${ARCH_DIR}/${ARCH_FILES.edges}`;
  const baseline = `${ARCH_DIR}/${ARCH_FILES.baseline}`;
  if (
    relativePath === contract ||
    relativePath === edges ||
    relativePath === baseline
  ) {
    return;
  }
  const componentsPrefix = `${ARCH_DIR}/${ARCH_FILES.components}/`;
  if (relativePath.startsWith(componentsPrefix)) {
    const name = relativePath.slice(componentsPrefix.length);
    if (name.endsWith('.json') && ID_RE.test(name.slice(0, -'.json'.length))) {
      return;
    }
  }
  throw new Error(
    `refused to write "${relativePath}": the writer only writes the compiled ` +
      `contract names under ${ARCH_DIR}/`
  );
}

/** The fixed shape every contract file is written in, the skeleton's own. */
export function archFileText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * The seed plan: the skeleton's buffers, minus `baseline.json`.
 *
 * The skeleton still drafts a baseline buffer for the buffer path older
 * probes drive; the SEED skips it, because `emptyArchDocument` already reads
 * an absent file as empty and the file's first writer must be the person's
 * own accept.
 */
export function planSkeletonWrite(
  buffers: readonly SkeletonBuffer[]
): ArchWritePlanFile[] {
  const baseline = `${ARCH_DIR}/${ARCH_FILES.baseline}`;
  const plan = buffers
    .filter((buffer) => buffer.path !== baseline)
    .map((buffer) => ({ path: buffer.path, text: buffer.text }));
  for (const file of plan) assertArchWritePath(file.path);
  return plan;
}

/**
 * The enrichment plan: contract, one file per component, and the promises.
 *
 * Every path is composed HERE from the compiled names and the validated
 * component id. The id passed the validator's `idField` already; it is
 * re-checked against the pattern anyway, because this module must hold its
 * rule alone.
 */
export function planEnrichedWrite(answer: ArchEnrichAnswer): ArchWritePlanFile[] {
  const plan: ArchWritePlanFile[] = [
    {
      path: `${ARCH_DIR}/${ARCH_FILES.contract}`,
      text: archFileText(answer.contract)
    }
  ];
  for (const component of [...answer.components].sort((a, b) =>
    a.id < b.id ? -1 : 1
  )) {
    if (!ID_RE.test(component.id)) {
      throw new Error(
        `refused to plan a component file: "${component.id}" is not a usable id`
      );
    }
    plan.push({
      path: `${ARCH_DIR}/${ARCH_FILES.components}/${component.id}.json`,
      text: archFileText(component)
    });
  }
  plan.push({
    path: `${ARCH_DIR}/${ARCH_FILES.edges}`,
    text: archFileText({ edges: answer.edges })
  });
  for (const file of plan) assertArchWritePath(file.path);
  return plan;
}

/**
 * Write one plan under one repository root. Directories are made as needed,
 * every path is re-checked, and the written repository relative paths come
 * back for the caller's record. Nothing is staged and nothing is committed:
 * the change is an ordinary uncommitted edit in Source Control.
 */
export async function writeArchFiles(
  repoRoot: string,
  plan: readonly ArchWritePlanFile[]
): Promise<string[]> {
  const wrote: string[] = [];
  for (const file of plan) {
    assertArchWritePath(file.path);
    const absolute = join(repoRoot, file.path);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, file.text, 'utf8');
    wrote.push(file.path);
  }
  return wrote;
}

/** What one accept came back with. */
export interface ArchAcceptResult {
  ok: boolean;
  /** One sentence a person can act on. Null when the append landed. */
  reason: string | null;
}

/**
 * The ONE writer of `docs/arch/baseline.json`, and the person's own gesture
 * is the only caller: the accept button on a failing row in the arch pane.
 *
 * The decision and the reason are the person's; the JSON typing is not.
 * Every field is validated through the same schema helpers the reader uses,
 * the current file is read through the one load path, the row is appended,
 * and the whole file is rewritten in the fixed contract shape. An invalid
 * field refuses the whole append with the reason named, and the file on disk
 * is untouched.
 */
export async function appendAcceptedDivergence(
  repoRoot: string,
  row: { edgeId?: string; fromPath: string; toPath: string; because: string; at: string }
): Promise<ArchAcceptResult> {
  let accepted: ArchAcceptedRow;
  try {
    accepted = {
      ...(row.edgeId === undefined
        ? {}
        : {
            edgeId: plainString(row.edgeId, 'edgeId', ARCH_LIMITS.maxId)
          }),
      fromPath: pathField(row.fromPath, 'fromPath'),
      toPath: pathField(row.toPath, 'toPath'),
      because: plainString(row.because, 'because', ARCH_LIMITS.maxBecause),
      at: dayField(row.at, 'at')
    };
  } catch (err) {
    const reason =
      err instanceof ArchRowError ? err.message : 'the row could not be read';
    return { ok: false, reason };
  }

  const baselinePath = `${ARCH_DIR}/${ARCH_FILES.baseline}`;
  const fs = createArchFileSystem(repoRoot);
  const text = await fs.readFile(baselinePath);
  let current: ArchBaseline = { accepted: [] };
  if (text !== null) {
    const parsed = parseArchJson(text, baselinePath);
    if (parsed.value === null) {
      return {
        ok: false,
        reason:
          'baseline.json is not valid JSON right now, so nothing was appended. ' +
          'Fix the file first.'
      };
    }
    const validated = validateBaseline(parsed.value, baselinePath);
    if (validated.value === null) {
      return {
        ok: false,
        reason:
          'baseline.json failed validation, so nothing was appended. Fix the ' +
          'file first.'
      };
    }
    current = validated.value;
  }
  if (current.accepted.length >= ARCH_LIMITS.maxAccepted) {
    return {
      ok: false,
      reason: `baseline.json already holds ${current.accepted.length} accepted rows, which is the bound`
    };
  }
  const next: ArchBaseline = { accepted: [...current.accepted, accepted] };
  await writeArchFiles(repoRoot, [
    { path: baselinePath, text: archFileText(next) }
  ]);
  return { ok: true, reason: null };
}
