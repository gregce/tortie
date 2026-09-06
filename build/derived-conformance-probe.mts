/**
 * The predicate half of `npm run conformance:derived` (Phase 215).
 *
 * It runs the SHIPPING derived-stream module over the fixtures the checker
 * wrote and prints what it answered, as JSON. The checker beside it judges.
 *
 * IT SPAWNS NOTHING. It opens no manifest, starts no tmux server, launches no
 * Electron, makes no request and reads nothing under the person's home.
 *
 * `P215_DERIVED` points at the module to run. It defaults to the shipping one
 * and the checker sets it to an ABLATED COPY when it is proving that a rule can
 * fail. The copy is one file because the module imports nothing at all.
 */

import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { DESCRIPTORS } from '../src/main/manifest/harvest/stores';

const modulePath =
  process.env['P215_DERIVED'] ?? resolve('src/main/manifest/harvest/derived.ts');
const derived = (await import(pathToFileURL(modulePath).href)) as typeof import('../src/main/manifest/harvest/derived');

interface Fixtures {
  /** name -> the line-1 record, already parsed. */
  records: Record<string, Record<string, unknown>>;
  /** name -> {start, nodes: {id: {kind, parent}}} */
  chains: Record<
    string,
    {
      start: string;
      maxHops?: number;
      nodes: Record<string, { kind: string; parent: string | null }>;
    }
  >;
  /** name -> {roots, path} for the path form. */
  paths: Record<string, { agent: string; roots: string[]; path: string }>;
}

const fixtures = JSON.parse(
  readFileSync(process.env['P215_FIXTURES'] ?? '', 'utf8')
) as Fixtures;

const predicate: Record<string, boolean> = {};
const parent: Record<string, string | null> = {};
for (const [name, record] of Object.entries(fixtures.records)) {
  predicate[name] = derived.codexDerivedRecord([record]);
  parent[name] = derived.codexParentThreadId(record);
}

const walk: Record<string, { verdict: string; resolved: string | null; hops: number }> =
  {};
for (const [name, chain] of Object.entries(fixtures.chains)) {
  const lookup = {
    classify: (id: string): 'session' | 'derived' | 'unknown' | 'absent' => {
      const node = chain.nodes[id.toLowerCase()];
      return (node?.kind ?? 'absent') as 'session' | 'derived' | 'unknown' | 'absent';
    },
    parentOf: (id: string): string | null =>
      chain.nodes[id.toLowerCase()]?.parent ?? null
  };
  const result = derived.walkToResumableThread(
    chain.start,
    lookup,
    chain.maxHops ?? derived.MAX_PARENT_HOPS
  );
  walk[name] = {
    verdict: result.verdict,
    resolved: result.resolved,
    hops: result.hops
  };
}

const pathForm: Record<string, boolean> = {};
for (const [name, spec] of Object.entries(fixtures.paths)) {
  const descriptor = DESCRIPTORS[spec.agent as keyof typeof DESCRIPTORS];
  pathForm[name] =
    descriptor === undefined
      ? false
      : derived.derivedByPath(descriptor.derivedStream, spec.roots, spec.path);
}

process.stdout.write(
  JSON.stringify({
    maxHops: derived.MAX_PARENT_HOPS,
    descriptors: Object.entries(DESCRIPTORS).map(([agent, d]) => ({
      agent,
      key: d?.key ?? null,
      confidence: d?.confidence ?? null,
      answered: d?.derivedStream !== undefined,
      kind: d?.derivedStream?.kind ?? null,
      measured: d?.derivedStream?.measured ?? null,
      lines:
        d?.derivedStream?.kind === 'record' ? d.derivedStream.lines : 0,
      hasTest:
        d?.derivedStream?.kind === 'none'
          ? null
          : typeof (d?.derivedStream as { test?: unknown } | undefined)?.test ===
            'function'
    })),
    predicate,
    parent,
    walk,
    pathForm
  })
);
