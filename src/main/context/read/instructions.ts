/**
 * Instructions — the section that earns its place on the import chain.
 *
 * The other four sections list things the Explorer cannot show because they
 * live outside the project. This one lists things the Explorer cannot show
 * because the LINKS between them are invisible. On this machine the agents in
 * this repository load `/Users/gdc/CLAUDE.md`, which imports `@AGENTS.md`,
 * which imports `@.tessl/RULES.md`, and then `gmux/CLAUDE.md` on top: four
 * files, three hops, and a file tree can only ever show one of them because
 * the other three are somewhere else.
 *
 * These files all load and they concatenate, so the order is the only fact
 * that matters and there is no precedence to apply. The byte count per file
 * and the chain total are the honest cost of context that is always loaded,
 * on every single turn, whether or not it is relevant.
 */

import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import type { InstructionPayload } from '@shared/context';
import type { Candidate, ReadContext } from '../candidate';
import type { ContextLocation } from '../agent-context';
import { maskInline } from '../secrets';
import { resolveLocations } from './locations';

const LIMITS = {
  /** A chain longer than this is a loop the cycle check did not catch. */
  maxFiles: 60,
  maxImportDepth: 5,
  maxBytes: 2 * 1024 * 1024,
  maxWalkLevels: 24
} as const;

/**
 * `@path/to/file`, at the start of a line or after whitespace: Claude Code's
 * import syntax. It is not restricted to a line of its own, and on this
 * machine it is not used that way — `~/AGENTS.md` reads
 * `@.tessl/RULES.md follow the instructions`.
 *
 * A loose pattern over prose would match an `@handle`, so two things narrow
 * it. Code spans and fenced blocks are removed first, which is what the agents
 * do too. And a target that is not a file on disk is dropped in `addFile`,
 * because a chain entry that cannot be opened is worse than a missing one.
 */
const IMPORT_LINE = /(?:^|\s)@([^\s@`'"()[\]]+)/gm;

/** Fenced blocks and inline code spans are not imports. */
function withoutCode(text: string): string {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

/** First line that is not blank, not a heading and not frontmatter. */
export function firstMeaningfulLine(text: string): string {
  const lines = text.split('\n');
  let inFrontmatter = false;
  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] ?? '').trim();
    if (i === 0 && line === '---') {
      inFrontmatter = true;
      continue;
    }
    if (inFrontmatter) {
      if (line === '---') inFrontmatter = false;
      continue;
    }
    if (line === '' || line.startsWith('#') || line.startsWith('<!--')) continue;
    return line.length > 200 ? `${line.slice(0, 199)}…` : line;
  }
  return '';
}

interface ChainState {
  ctx: ReadContext;
  out: Candidate[];
  seen: Set<string>;
  order: { value: number };
  location: ContextLocation;
}

async function addFile(
  state: ChainState,
  path: string,
  importedBy: string | null,
  depth: number
): Promise<void> {
  if (state.out.length >= LIMITS.maxFiles) {
    state.ctx.markTruncated();
    return;
  }
  const real = await state.ctx.fs.realPath(path);
  if (state.seen.has(real)) return;
  const text = await state.ctx.fs.readText(path, LIMITS.maxBytes);
  if (text === null) return;
  state.seen.add(real);

  const payload: InstructionPayload = {
    kind: 'instruction',
    bytes: Buffer.byteLength(text),
    firstLine: maskInline(firstMeaningfulLine(text)),
    importedBy,
    importDepth: depth,
    order: state.order.value
  };
  state.order.value += 1;
  state.out.push({
    category: 'instruction',
    agent: state.ctx.agent,
    name: basename(path),
    identity: `instruction:${real}`,
    scope: state.location.scope,
    rank: state.location.rank,
    sourcePath: path,
    realPath: real,
    evidence: state.location.evidence,
    bundled: false,
    summary: payload.firstLine,
    payload,
    problem: null,
    disabled: false,
    managed: state.location.scope === 'managed',
    hashTarget: { kind: 'file', path },
    executes: null,
    order: payload.order
  });

  if (depth >= LIMITS.maxImportDepth) return;
  const scannable = withoutCode(text);
  IMPORT_LINE.lastIndex = 0;
  const targets: string[] = [];
  for (
    let match = IMPORT_LINE.exec(scannable);
    match;
    match = IMPORT_LINE.exec(scannable)
  ) {
    const raw = match[1];
    if (raw && (raw.includes('/') || /\.\w{1,9}$/.test(raw))) targets.push(raw);
  }
  for (const target of targets) {
    const expanded = target.startsWith('~/')
      ? join(state.ctx.homes.home, target.slice(2))
      : isAbsolute(target)
        ? target
        : resolve(dirname(path), target);
    await addFile(state, expanded, path, depth + 1);
  }
}

/** The same file name, at every level from the home directory down to cwd. */
async function walkUp(state: ChainState, from: string, fileName: string): Promise<void> {
  const home = state.ctx.homes.home;
  const levels: string[] = [];
  let dir = from;
  for (let i = 0; i < LIMITS.maxWalkLevels; i += 1) {
    levels.push(dir);
    if (dir === home || dir === '/' || dir === dirname(dir)) break;
    dir = dirname(dir);
  }
  // Broadest first, because that is the order they concatenate in.
  for (const level of levels.reverse()) {
    await addFile(state, join(level, fileName), null, 0);
  }
}

async function readGlob(
  state: ChainState,
  dir: string,
  suffix: string
): Promise<void> {
  const entries = await state.ctx.fs.readDir(dir);
  if (!entries) return;
  const names = entries
    .filter((entry) => entry.isFile && !entry.name.startsWith('.') && entry.name.endsWith(suffix))
    .map((entry) => entry.name)
    .sort();
  for (const name of names) await addFile(state, join(dir, name), null, 0);
}

export async function readInstructions(
  ctx: ReadContext,
  locations: readonly ContextLocation[]
): Promise<Candidate[]> {
  const resolved = await resolveLocations(ctx, locations);
  const out: Candidate[] = [];
  const seen = new Set<string>();
  const order = { value: 0 };
  for (const { location, path } of resolved) {
    const state: ChainState = { ctx, out, seen, order, location };
    switch (location.reader) {
      case 'instruction-file':
        await addFile(state, path, null, 0);
        break;
      case 'instruction-walk':
        await walkUp(state, path, location.file ?? 'AGENTS.md');
        break;
      case 'instruction-glob':
        await readGlob(state, path, location.file ?? '.md');
        break;
      default:
        break;
    }
  }
  return out;
}
