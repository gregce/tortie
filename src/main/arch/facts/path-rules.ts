/**
 * The PATH rules and the declaration shaped surfaces (Phase 257).
 *
 * Convention, and labelled as such: a fact's rule id says `path` or
 * `by-name`, so a reader knows the evidence is the filename rather than
 * anything in it. `boundary.path.module-root` is the thirty of the forty five
 * judged boundary facts that research 118 §7.6 split from the fifteen that
 * say what a repository builds and starts; it is written with the kind the
 * schema keeps apart, and it is never a process.
 *
 * `declarationSurfaces` is research 118 §6.2 item 1: a rule table of call
 * sites is half a table. A Next.js app router handler is
 * `export async function GET(req)` in a file whose PATH is the route, there
 * is nothing to call, and one declaration shaped family took stoa from 0 to
 * 362 of 362.
 */

import type { ArchFactDraft } from '@shared/arch';
import { FACT_LIMITS } from './limits';
import { MIGRATION_FILE } from './manifests';

const ENTRY_BY_NAME = /^(src\/)?(main|index|app|server|cli|bin|__main__)\.(ts|tsx|js|mjs|cjs|py|rs|go|rb|swift)$/;
const CMD_DIR = /^(cmd|bin)\//;
const CMD_EXT = /\.(go|rs|ts|js|py|rb)$/;
const MODULE_ROOTS: ReadonlySet<string> = new Set(['lib.rs', 'mod.rs', '__init__.py', 'index.ts']);

const NEXT_ROUTE = /^(.*\/)?(app|src\/app|pages\/api)\/(.+)\/route\.(ts|tsx|js|mjs)$/;
const NEXT_EXPORT = /^export\s+(?:async\s+)?(?:const|function)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/;
const SVELTE_ROUTE = /^(.*\/)?(src\/routes)\/(.+)\/\+server\.(ts|js)$/;
const SVELTE_EXPORT = /^export\s+(?:async\s+)?(?:const|function)\s+(GET|POST|PUT|PATCH|DELETE)\b/;

/** Facts a PATH alone establishes. Line 1 and the path as evidence. */
export function pathFacts(relPath: string): ArchFactDraft[] {
  const out: ArchFactDraft[] = [];
  const base = relPath.slice(relPath.lastIndexOf('/') + 1);
  const add = (category: ArchFactDraft['category'], kind: string, subject: string, rule: string): void => {
    out.push({
      category,
      kind,
      subject: subject.slice(0, FACT_LIMITS.maxSubject),
      line: 1,
      rule,
      evidence: relPath.slice(0, FACT_LIMITS.maxEvidence)
    });
  };
  if (ENTRY_BY_NAME.test(relPath) || relPath === 'config.ru') {
    add('entrypoint', 'by-name', `entry file ${relPath}`, 'entrypoint.path.by-name');
  }
  if (CMD_DIR.test(relPath) && CMD_EXT.test(base)) {
    add('entrypoint', 'by-name', `command file ${relPath}`, 'entrypoint.path.cmd-dir');
  }
  if (MODULE_ROOTS.has(base)) {
    add('boundary', 'module-root', `module root ${relPath}`, 'boundary.path.module-root');
  }
  // The same test the manifest reader uses, so a directory named
  // `migrations` holding a diagram yields nothing on either side.
  if (MIGRATION_FILE.test(relPath)) {
    add('store', 'migration', `migration ${relPath}`, 'store.path.migration');
  }
  return out;
}

/** Surfaces declared by an exported name in a file whose path is the route. */
export function declarationSurfaces(relPath: string, lines: readonly string[]): ArchFactDraft[] {
  const out: ArchFactDraft[] = [];
  const push = (subject: string, line: number, rule: string): void => {
    out.push({
      category: 'surface',
      kind: 'http-route',
      subject: subject.slice(0, FACT_LIMITS.maxSubject),
      line,
      rule,
      evidence: (lines[line - 1] ?? '').trim().slice(0, FACT_LIMITS.maxEvidence)
    });
  };
  const next = NEXT_ROUTE.exec(relPath);
  if (next !== null) {
    const path = `/${next[3]!.replace(/\/route$/, '')}`;
    lines.forEach((ln, i) => {
      const m = NEXT_EXPORT.exec(ln);
      if (m !== null) push(`HTTP ${m[1]} ${path}`, i + 1, 'surface.http.next-export');
    });
  }
  const svelte = SVELTE_ROUTE.exec(relPath);
  if (svelte !== null) {
    lines.forEach((ln, i) => {
      const m = SVELTE_EXPORT.exec(ln);
      if (m !== null) push(`HTTP ${m[1]} /${svelte[3]}`, i + 1, 'surface.http.svelte-export');
    });
  }
  return out;
}
