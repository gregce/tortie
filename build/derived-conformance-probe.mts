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
import {
  confirmRemoteCandidate,
  decideRemoteHarvest,
  type RemoteCandidate,
  type RemoteConfirmVerdict
} from '../src/main/manifest/harvest/remote';

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
  /** Rule 8: the remote arm, driven at the head budget the live half sends. */
  remote: {
    headBytes: number;
    sessionCwd: string;
    cases: Record<
      string,
      { record: Record<string, unknown>; bytes: number }
    >;
  };
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

// ---------------------------------------------------------------------------
// Rule 8. The remote arm, at the head budget and at full length.
//
// The remote rung reads HEAD BYTES rather than a file, so what its refusal is
// worth depends on how many bytes it is handed. This drives the SHIPPING
// `confirmRemoteCandidate` over records padded to exact byte lengths, and the
// checker beside it judges against the budget it read out of the live half.
// ---------------------------------------------------------------------------

/** One JSON line whose UTF-8 length is exactly `bytes`, padded in `payload.filler`. */
function lineOfExactBytes(record: Record<string, unknown>, bytes: number): string {
  const payload = record['payload'] as Record<string, unknown>;
  payload['filler'] = '';
  const base = Buffer.byteLength(JSON.stringify(record), 'utf8');
  if (base > bytes) throw new Error(`record is already ${base} bytes, over ${bytes}`);
  payload['filler'] = 'x'.repeat(bytes - base);
  return JSON.stringify(record);
}

const remoteOut: Record<
  string,
  { line1Bytes: number; atHead: RemoteConfirmVerdict; atFull: RemoteConfirmVerdict }
> = {};
for (const [name, spec] of Object.entries(fixtures.remote.cases)) {
  const line = lineOfExactBytes(spec.record, spec.bytes);
  // A real rollout has records after line 1, so the truncation this rung meets
  // is a truncation of line 1 rather than the end of a file.
  const full = `${line}\n${JSON.stringify({ type: 'event_msg', payload: {} })}\n`;
  const head = Buffer.from(full, 'utf8')
    .subarray(0, fixtures.remote.headBytes)
    .toString('utf8');
  const ctx = { cwd: fixtures.remote.sessionCwd };
  remoteOut[name] = {
    line1Bytes: Buffer.byteLength(line, 'utf8'),
    atHead: confirmRemoteCandidate('codex', head, ctx),
    atFull: confirmRemoteCandidate('codex', full, ctx)
  };
}

/** What one verdict is worth to the decision: only `match` may ever win. */
function decideWith(verdict: RemoteConfirmVerdict): string | null {
  const candidate: RemoteCandidate = {
    path: '/home/x/.codex/sessions/2026/09/03/rollout-a.jsonl',
    mtimeMs: 1_000,
    bytes: 10,
    sessionId: 'the-only-candidate',
    orderTs: 1_000
  };
  const winner = decideRemoteHarvest(
    'codex',
    [candidate],
    new Map([[candidate.path, verdict]])
  );
  return winner?.candidate.sessionId ?? null;
}

process.stdout.write(
  JSON.stringify({
    maxHops: derived.MAX_PARENT_HOPS,
    remote: {
      headBytes: fixtures.remote.headBytes,
      cases: remoteOut,
      decide: {
        match: decideWith('match'),
        unknown: decideWith('unknown'),
        mismatch: decideWith('mismatch')
      }
    },
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
