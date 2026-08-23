/**
 * The path index extractor. The rules are mechanical, section 6.5 of the
 * spec, and each one is asserted here on its own.
 */

import { describe, expect, it } from 'vitest';
import { extractPathsFromText, mergePathMentions } from '../reader';
import { JSONL_CASES, readFixture } from './reader-helpers';

const CWD = '/Users/dev/demo-app';
const PROJECT = '/Users/dev/demo-app';

const paths = (text: string): string[] =>
  extractPathsFromText(text, CWD, PROJECT).map((m) => m.path);

describe('extractPathsFromText', () => {
  it('keeps a relative token and records it project relative', () => {
    expect(paths('read scripts/release.sh please')).toEqual(['scripts/release.sh']);
  });

  it('keeps an extension token with no slash', () => {
    expect(paths('the fix is in release.sh now')).toEqual(['release.sh']);
  });

  it('resolves a relative token against the cwd', () => {
    const m = extractPathsFromText('open ./src/index.ts', CWD, PROJECT)[0]!;
    expect(m.path).toBe('src/index.ts');
    expect(m.inside).toBe(true);
  });

  it('records an absolute token inside the project as project relative', () => {
    const m = extractPathsFromText(`cat ${PROJECT}/docs/PLAN.md`, CWD, PROJECT)[0]!;
    expect(m.path).toBe('docs/PLAN.md');
    expect(m.inside).toBe(true);
  });

  it('keeps an absolute token outside the project as absolute, inside false', () => {
    const m = extractPathsFromText('cat /etc/hosts', CWD, PROJECT)[0]!;
    expect(m.path).toBe('/etc/hosts');
    expect(m.inside).toBe(false);
  });

  it('drops a relative token that escapes the project through dot dot', () => {
    expect(paths('cat ../secrets/key.pem')).toEqual([]);
  });

  it('drops urls, template holes and flags', () => {
    expect(paths('see https://example.com/a/b.ts and ${HOME}/x.ts and --file=a/b')).toEqual([]);
  });

  it('drops a token longer than 300 characters', () => {
    expect(paths('x/'.repeat(200))).toEqual([]);
  });

  it('strips wrapping punctuation and backticks', () => {
    expect(paths('(`scripts/release.sh`),')).toEqual(['scripts/release.sh']);
    expect(paths('"src/a.ts";')).toEqual(['src/a.ts']);
  });

  it('counts mentions and sorts by them, descending', () => {
    const out = extractPathsFromText('a/b.ts then c/d.ts then a/b.ts again', CWD, PROJECT);
    expect(out[0]!.path).toBe('a/b.ts');
    expect(out[0]!.mentions).toBe(2);
    expect(out[1]!.path).toBe('c/d.ts');
  });

  it('caps the list at 200 distinct paths', () => {
    const text = Array.from({ length: 260 }, (_, i) => `src/f${i}.ts`).join(' ');
    expect(extractPathsFromText(text, CWD, PROJECT).length).toBe(200);
  });
});

describe('mergePathMentions', () => {
  it('sums mentions and lets the stronger source win', () => {
    const a = extractPathsFromText('src/a.ts', CWD, PROJECT, 'text');
    const b = extractPathsFromText('src/a.ts', CWD, PROJECT, 'tool');
    const merged = mergePathMentions([a, b]);
    expect(merged.length).toBe(1);
    expect(merged[0]!.mentions).toBe(2);
    expect(merged[0]!.source).toBe('tool');
  });
});

describe('the path index against the fixtures', () => {
  it('claude turn one names scripts/release.sh from the Bash command', () => {
    const r = readFixture(JSONL_CASES['claude']!);
    expect(r.turns[0]!.paths.some((m) => m.path === 'scripts/release.sh')).toBe(true);
  });

  it('codex turn one names src/nest_counter.py from the command execution item', () => {
    const r = readFixture(JSONL_CASES['codex']!);
    expect(r.turns[0]!.paths.some((m) => m.path === 'src/nest_counter.py')).toBe(true);
  });

  it('the payload is thrown away, only paths and counts survive', () => {
    const r = readFixture(JSONL_CASES['claude']!);
    for (const t of r.turns) {
      for (const m of t.paths) {
        expect(Object.keys(m).sort()).toEqual(['inside', 'mentions', 'path', 'source']);
      }
    }
  });
});
