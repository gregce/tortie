/**
 * The one writer (Phase 158): compiled paths only, the seed skips the
 * baseline, a hostile id is refused before any write, and the accept append
 * is the baseline's only writer and validates every field whole.
 */

import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { ArchComponent, ArchContract, ArchEdge } from '@shared/arch';
import {
  appendAcceptedDivergence,
  archFileText,
  assertArchWritePath,
  planEnrichedWrite,
  planSkeletonWrite,
  writeArchFiles
} from '../write';

let repo = '';

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), 'gmux-arch-write-'));
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

const contract: ArchContract = {
  version: 1,
  subject: 'fixture',
  strictness: 'not-wrong',
  layers: [
    { id: 'surface', name: 'surface', order: 0 },
    { id: 'engine', name: 'engine', order: 1 },
    { id: 'foundation', name: 'foundation', order: 2 }
  ],
  flows: []
};

const component: ArchComponent = {
  id: 'src-app',
  name: 'The App',
  kind: 'component',
  layer: 'surface',
  provenance: 'first-party',
  anchors: ['src/app'],
  boundary: 'open',
  description: 'Draws the screen.',
  evidence: [],
  deprecated: false,
  gaps: []
};

const edge: ArchEdge = {
  id: 'src-app-imports-src-core',
  from: 'src-app',
  to: 'src-core',
  kind: 'imports',
  rule: 'must',
  checker: 'imports',
  evidence: []
};

describe('assertArchWritePath', () => {
  it('accepts exactly the compiled names', () => {
    expect(() => assertArchWritePath('docs/arch/contract.json')).not.toThrow();
    expect(() => assertArchWritePath('docs/arch/edges.json')).not.toThrow();
    expect(() => assertArchWritePath('docs/arch/baseline.json')).not.toThrow();
    expect(() =>
      assertArchWritePath('docs/arch/components/src-app.json')
    ).not.toThrow();
  });

  it('refuses everything else, including traversal and bad ids', () => {
    for (const path of [
      'docs/arch/other.json',
      'docs/arch/components/../../evil.json',
      'docs/arch/components/UPPER.json',
      'docs/arch/components/a b.json',
      'docs/arch/components/evil.txt',
      'src/anything.ts',
      '/etc/passwd',
      'docs/arch/components/.json'
    ]) {
      expect(() => assertArchWritePath(path)).toThrow();
    }
  });
});

describe('planEnrichedWrite', () => {
  it('plans the contract, one file per part, the edges, and never the baseline', () => {
    const plan = planEnrichedWrite({
      contract,
      components: [component],
      edges: [edge],
      suggestions: ['never written']
    });
    const paths = plan.map((file) => file.path);
    expect(paths).toEqual([
      'docs/arch/contract.json',
      'docs/arch/components/src-app.json',
      'docs/arch/edges.json'
    ]);
    expect(paths).not.toContain('docs/arch/baseline.json');
    // The suggestions never reach any planned byte.
    expect(plan.some((file) => file.text.includes('never written'))).toBe(false);
  });

  it('refuses a hostile component id before any write', () => {
    expect(() =>
      planEnrichedWrite({
        contract,
        components: [{ ...component, id: '../evil' }],
        edges: [],
        suggestions: []
      })
    ).toThrow();
  });
});

describe('writeArchFiles', () => {
  it('writes the plan under the repository root and reports the paths', async () => {
    const wrote = await writeArchFiles(repo, [
      { path: 'docs/arch/contract.json', text: archFileText(contract) }
    ]);
    expect(wrote).toEqual(['docs/arch/contract.json']);
    const text = readFileSync(join(repo, 'docs/arch/contract.json'), 'utf8');
    expect(text).toBe(archFileText(contract));
  });

  it('re-checks every path at the write, whatever the caller composed', async () => {
    await expect(
      writeArchFiles(repo, [{ path: 'docs/evil.json', text: '{}' }])
    ).rejects.toThrow();
    expect(existsSync(join(repo, 'docs/evil.json'))).toBe(false);
  });
});

describe('planSkeletonWrite skips the baseline', () => {
  it('drops baseline.json from the seed plan', () => {
    const plan = planSkeletonWrite([
      { path: 'docs/arch/contract.json', text: '{}\n' },
      { path: 'docs/arch/baseline.json', text: '{"accepted": []}\n' },
      { path: 'docs/arch/edges.json', text: '{"edges": []}\n' }
    ]);
    expect(plan.map((file) => file.path)).toEqual([
      'docs/arch/contract.json',
      'docs/arch/edges.json'
    ]);
  });
});

describe('appendAcceptedDivergence, the one baseline writer', () => {
  it('creates the file on the first accept and appends on the second', async () => {
    const first = await appendAcceptedDivergence(repo, {
      fromPath: 'src/app/a.ts',
      toPath: 'src/core/b.ts',
      because: 'The migration is halfway.',
      at: '2026-08-28'
    });
    expect(first).toEqual({ ok: true, reason: null });
    const second = await appendAcceptedDivergence(repo, {
      edgeId: 'src-app-imports-src-core',
      fromPath: 'src/app/c.ts',
      toPath: 'src/core/d.ts',
      because: 'Accepted for the release.',
      at: '2026-08-28'
    });
    expect(second.ok).toBe(true);
    const text = readFileSync(join(repo, 'docs/arch/baseline.json'), 'utf8');
    const parsed = JSON.parse(text) as { accepted: unknown[] };
    expect(parsed.accepted).toHaveLength(2);
    expect(text.endsWith('\n')).toBe(true);
  });

  it('refuses a bad field whole, naming it, and writes nothing', async () => {
    const result = await appendAcceptedDivergence(repo, {
      fromPath: '../escape.ts',
      toPath: 'src/core/b.ts',
      because: 'x',
      at: '2026-08-28'
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('fromPath');
    expect(existsSync(join(repo, 'docs/arch/baseline.json'))).toBe(false);
  });

  it('refuses an empty reason and a malformed day', async () => {
    const noReason = await appendAcceptedDivergence(repo, {
      fromPath: 'src/a.ts',
      toPath: 'src/b.ts',
      because: '',
      at: '2026-08-28'
    });
    expect(noReason.ok).toBe(false);
    const badDay = await appendAcceptedDivergence(repo, {
      fromPath: 'src/a.ts',
      toPath: 'src/b.ts',
      because: 'fine',
      at: 'yesterday'
    });
    expect(badDay.ok).toBe(false);
    expect(existsSync(join(repo, 'docs/arch/baseline.json'))).toBe(false);
  });

  it('refuses to append into a corrupt baseline rather than replacing it', async () => {
    await writeArchFiles(repo, [
      { path: 'docs/arch/baseline.json', text: 'not json' }
    ]);
    const result = await appendAcceptedDivergence(repo, {
      fromPath: 'src/a.ts',
      toPath: 'src/b.ts',
      because: 'fine',
      at: '2026-08-28'
    });
    expect(result.ok).toBe(false);
    expect(readFileSync(join(repo, 'docs/arch/baseline.json'), 'utf8')).toBe(
      'not json'
    );
  });
});
