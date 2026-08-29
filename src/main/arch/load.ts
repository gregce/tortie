/**
 * Reading `docs/arch/` (Phase 63, research 49 section 4.5).
 *
 * This is the ONE place a contract file is read. `./schema.ts` and
 * `./validate.ts` are pure, and keeping the read here is what makes "the
 * validator cannot be made to open a file a contract names" a fact about the
 * code rather than a promise. Nothing in this module opens a path that came out
 * of a contract: the four file names are compiled in, and the components
 * directory is listed rather than named.
 *
 * ## The cross file rules, and both of them drop the row whole
 *
 * - A component whose `layer` names no band in `contract.json` is dropped, with
 *   the field and the reason named. It has nowhere to draw.
 * - An edge whose `from` or `to` names no component is dropped, with the field
 *   and the reason named. A dangling promise cannot be judged and drawing it
 *   would invent a part.
 *
 * Both are checked here rather than in `./validate.ts`, because both need the
 * whole document and one file cannot know about another.
 *
 * ## The last valid contract keeps rendering
 *
 * A half written or failed parse never blanks the view. {@link keepLastValid}
 * takes what was there and what has just been read, and returns the one to
 * draw. A read that produced no contract keeps the previous one and carries
 * every problem from the new read, so the view says what failed while still
 * showing something true from a moment ago.
 *
 * ## The one reader, and since Phase 158 the one writer beside it
 *
 * There is no writer in this module. Since Phase 158 exactly one module under
 * `src/main/arch/` writes contract files, being `./enrich/write.ts`, and it
 * holds this module's rule inverted: every path written is a compiled name,
 * and no path from a model's answer ever reaches the filesystem.
 * `baseline.json` keeps the ArchUnit pattern in its amended form: the
 * enrichment pass can never write it, and its only writer is the accept
 * button's own channel, fired by the person whose decision it records.
 */

import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
  ARCH_DIR,
  ARCH_FILES,
  ARCH_LIMITS,
  type ArchComponent,
  type ArchDocument,
  type ArchEdge,
  type ArchProblem
} from '@shared/arch';
import {
  parseArchJson,
  validateBaseline,
  validateComponent,
  validateContract,
  validateEdges
} from './validate';

/**
 * The seam that reads bytes.
 *
 * It is injected so the gate can drive a whole load over a committed fixture
 * without a real repository, and so a test can prove the drop whole behaviour
 * without writing files. The real one is {@link createArchFileSystem}.
 */
export interface ArchFileSystem {
  /** The file's text, or null when it is not there. Never throws. */
  readFile(relativePath: string): Promise<string | null>;
  /** The entries of a directory, or an empty list when it is not there. Never throws. */
  readDir(relativePath: string): Promise<string[]>;
}

/** Where a document came from, so a problem can name a path a person recognises. */
const contractPath = `${ARCH_DIR}/${ARCH_FILES.contract}`;
const edgesPath = `${ARCH_DIR}/${ARCH_FILES.edges}`;
const baselinePath = `${ARCH_DIR}/${ARCH_FILES.baseline}`;
const componentsDir = `${ARCH_DIR}/${ARCH_FILES.components}`;

/** An empty document, which is what a repository with no contract has. */
export function emptyArchDocument(): ArchDocument {
  return { contract: null, components: [], edges: [], baseline: { accepted: [] }, problems: [] };
}

/**
 * Read and validate the whole of `docs/arch/`.
 *
 * It never throws. Every failure is a problem naming the file, the field and
 * the reason, which is the same rule the machine row and the agent overlay
 * follow.
 */
export async function loadArchDocument(fs: ArchFileSystem): Promise<ArchDocument> {
  const problems: ArchProblem[] = [];
  const doc = emptyArchDocument();

  const contractText = await fs.readFile(contractPath);
  if (contractText === null) {
    return doc;
  }
  const parsedContract = parseArchJson(contractText, contractPath);
  problems.push(...parsedContract.problems);
  if (parsedContract.value === null) {
    doc.problems = problems;
    return doc;
  }
  const contract = validateContract(parsedContract.value, contractPath);
  problems.push(...contract.problems);
  if (contract.value === null) {
    doc.problems = problems;
    return doc;
  }
  doc.contract = contract.value;
  const layerIds = new Set(contract.value.layers.map((layer) => layer.id));

  // The components, one file each, read in name order so a run is repeatable.
  const entries = (await fs.readDir(componentsDir))
    .filter((name) => name.endsWith('.json'))
    .sort();
  const components: ArchComponent[] = [];
  const seenIds = new Set<string>();
  for (const name of entries.slice(0, ARCH_LIMITS.maxComponents)) {
    const path = `${componentsDir}/${name}`;
    const text = await fs.readFile(path);
    if (text === null) continue;
    const parsed = parseArchJson(text, path);
    problems.push(...parsed.problems);
    if (parsed.value === null) continue;
    const result = validateComponent(parsed.value, path);
    problems.push(...result.problems);
    const row = result.value;
    if (row === null) continue;
    if (!layerIds.has(row.layer)) {
      problems.push({
        file: path,
        field: 'component.layer',
        message:
          `component.layer is "${row.layer}", and ${contractPath} has no band ` +
          `with that name. This part was left out, because there is nowhere ` +
          `to draw it.`
      });
      continue;
    }
    if (seenIds.has(row.id)) {
      problems.push({
        file: path,
        field: 'component.id',
        message:
          `component.id "${row.id}" is already used by another file. The ` +
          `first one is used and this one is left out, because a verdict keys ` +
          `on the id.`
      });
      continue;
    }
    seenIds.add(row.id);
    components.push(row);
  }
  if (entries.length > ARCH_LIMITS.maxComponents) {
    problems.push({
      file: componentsDir,
      field: 'components',
      message:
        `${componentsDir} holds ${entries.length} files and Tortie reads at ` +
        `most ${ARCH_LIMITS.maxComponents}. The rest were left out.`
    });
  }
  doc.components = components;

  // The promises. A dangling end drops the promise whole.
  const edgesText = await fs.readFile(edgesPath);
  if (edgesText !== null) {
    const parsed = parseArchJson(edgesText, edgesPath);
    problems.push(...parsed.problems);
    if (parsed.value !== null) {
      const result = validateEdges(parsed.value, edgesPath);
      problems.push(...result.problems);
      doc.edges = keepConnectedEdges(result.rows, seenIds, edgesPath, problems);
    }
  }

  // The accepted divergences. Read, never written.
  const baselineText = await fs.readFile(baselinePath);
  if (baselineText !== null) {
    const parsed = parseArchJson(baselineText, baselinePath);
    problems.push(...parsed.problems);
    if (parsed.value !== null) {
      const result = validateBaseline(parsed.value, baselinePath);
      problems.push(...result.problems);
      if (result.value !== null) doc.baseline = result.value;
    }
  }

  doc.problems = problems;
  return doc;
}

/** Drop every promise whose ends do not both name a part that was read. */
function keepConnectedEdges(
  rows: readonly ArchEdge[],
  componentIds: ReadonlySet<string>,
  file: string,
  problems: ArchProblem[]
): ArchEdge[] {
  const out: ArchEdge[] = [];
  for (const row of rows) {
    const missing = [row.from, row.to].filter((id) => !componentIds.has(id));
    if (missing.length === 0) {
      out.push(row);
      continue;
    }
    problems.push({
      file,
      field: `edges.${row.id}.${componentIds.has(row.from) ? 'to' : 'from'}`,
      message:
        `The promise "${row.id}" names ${missing.join(' and ')}, and no ` +
        `component file declares ${missing.length === 1 ? 'that id' : 'those ids'}. ` +
        `The promise was left out, because a promise with a missing end ` +
        `cannot be judged.`
    });
  }
  return out;
}

/**
 * Which document to draw, given what was there and what has just been read.
 *
 * A read that produced a contract wins. A read that produced none keeps the
 * previous one and takes the new read's problems, so the view can say "this is
 * the last contract that read, and here is what is wrong with the current one".
 */
export function keepLastValid(
  previous: ArchDocument | null,
  next: ArchDocument
): ArchDocument {
  if (next.contract !== null) return next;
  if (previous === null || previous.contract === null) return next;
  return { ...previous, problems: next.problems };
}

/** True when the view is drawing an older contract because the current one failed. */
export function isStaleRender(previous: ArchDocument | null, next: ArchDocument): boolean {
  return next.contract === null && previous !== null && previous.contract !== null;
}

/**
 * The real reader, over one repository.
 *
 * Every path it opens is the repository root joined with one of the four
 * compiled in names, or with an entry the components directory listed. No path
 * that came out of a contract file is ever passed to it, which is the read side
 * of the same rule `./argv-guard.ts` keeps on the spawn side.
 */
export function createArchFileSystem(repoPath: string): ArchFileSystem {
  return {
    async readFile(relativePath: string): Promise<string | null> {
      try {
        return await readFile(join(repoPath, relativePath), 'utf8');
      } catch {
        return null;
      }
    },
    async readDir(relativePath: string): Promise<string[]> {
      try {
        return await readdir(join(repoPath, relativePath));
      } catch {
        return [];
      }
    }
  };
}
