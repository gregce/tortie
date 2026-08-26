/**
 * The Architecture view's pure parts, tested where a screenshot cannot see
 * them (Phase 63).
 *
 * WHAT IS HERE AND WHAT IS NOT. The layout claims belong to the shot probe,
 * because they are claims about the shipped stylesheet under a live layout
 * engine and reading CSS is not seeing it. What is here is the arithmetic and
 * the ordering, which a photograph cannot check at all: that the strip never
 * folds three coverage lanes into one flattering total, that the divergence
 * list is deterministic so two runs of the SCM section draw the same rows in
 * the same order, and that the seeding prompt is byte deterministic, which is
 * the only claim that control makes.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ArchVerdict } from '@shared/arch';
import { archDivergences, divergencesForPath } from '../divergences';
import { isFailure, stripLanes, verdictClass, verdictIcon } from '../ArchView';
import { seedPromptText } from '../seed-prompt';
import { freshnessSentence, unresolvedSentence, verdictWord } from '../copy';

/** The shipped stylesheet, read as text: the colour claims are about IT. */
const CSS = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'arch.css'),
  'utf8'
);

function v(over: Partial<ArchVerdict>): ArchVerdict {
  return {
    subjectId: 'edge:x',
    status: 'convergent',
    coverage: 'checked',
    checkedAtCommit: '0'.repeat(40),
    generation: 1,
    firstCheck: false,
    reason: null,
    durationMs: 0,
    ...over
  } as ArchVerdict;
}

describe('the verdict strip', () => {
  it('keeps the three coverage lanes apart and never totals them', () => {
    const lanes = stripLanes({
      checkedHold: 12,
      broke: 1,
      cannotCheck: 21,
      accepted: 2,
      unresolvedImports: 0,
      totalImports: 0
    });
    expect(lanes.map((l) => l.n)).toEqual([12, 1, 21]);
    // The point of the split: nothing anywhere in the lane list adds the
    // uncheckable figure to the held one. 12 must never render as 33.
    expect(lanes.some((l) => l.n === 33)).toBe(false);
    expect(lanes.map((l) => l.key)).toEqual(['hold', 'broke', 'cannot']);
  });

  it('gives every status its own glyph, so colour is never the only channel', () => {
    const statuses = ['convergent', 'divergent', 'absent', 'unverifiable'];
    const icons = statuses.map(verdictIcon);
    expect(new Set(icons).size).toBe(4);
    const words = statuses.map(verdictWord);
    expect(new Set(words).size).toBe(4);
    // Every status gets its own class, so a later round can move one of them
    // without moving the others.
    expect(new Set(statuses.map(verdictClass)).size).toBe(4);
  });

  it('spends no amber and no yellow, which is the one hue reserved elsewhere', () => {
    // READ FROM THE SHIPPED STYLESHEET rather than asserted in prose. Amber
    // means "an agent needs you" everywhere else in this product, and research
    // 49 section 9.5 rejected it for staleness and provenance by name. A round
    // that reached for --warning or --status-attention here would be competing
    // with the only signal the product reserves, and this is the line that
    // says so out loud.
    expect(CSS).not.toContain('--warning');
    expect(CSS).not.toContain('--status-attention');
    // The three it DOES spend, and nothing else carries meaning.
    expect(CSS).toContain('--success');
    expect(CSS).toContain('--error');
  });

  it('gives broke and missing one colour, because both are failures', () => {
    const rule = (cls: string): string =>
      CSS.slice(CSS.indexOf(`.${cls} {`), CSS.indexOf(`.${cls} {`) + 60);
    expect(rule(verdictClass('divergent'))).toContain('--error');
    expect(rule(verdictClass('absent'))).toContain('--error');
    expect(rule(verdictClass('convergent'))).toContain('--success');
    expect(rule(verdictClass('unverifiable'))).toContain('--text-muted');
  });

  it('writes no colour literal at all, which is the DESIGN.md rule', () => {
    // Every colour goes through a token. A hex, an rgb() or an hsl() here is
    // the first hardcoded colour outside a theme constant file.
    expect(CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(CSS).not.toMatch(/\b(rgb|rgba|hsl|hsla)\(/);
  });

  it('says how many imports went unresolved, and nothing at all when none did', () => {
    expect(unresolvedSentence(0, 9800)).toBeNull();
    expect(unresolvedSentence(412, 9800)).toContain('412 of 9800');
    // The clause that stops a resolver miss reading as a verified absence.
    expect(unresolvedSentence(412, 9800)).toContain('claims they are absent');
  });
});

describe('the failure set', () => {
  it('counts divergent and absent, and nothing else', () => {
    expect(isFailure(v({ status: 'divergent' }))).toBe(true);
    expect(isFailure(v({ status: 'absent' }))).toBe(true);
    expect(isFailure(v({ status: 'convergent' }))).toBe(false);
    expect(isFailure(v({ status: 'unverifiable' }))).toBe(false);
  });
});

describe('the divergence rows Source Control draws', () => {
  const verdicts = [
    v({ status: 'convergent', subjectId: 'edge:fine' }),
    v({
      subjectId: 'edge:b',
      status: 'divergent',
      offending: [
        { fromPath: 'src/z.ts', toPath: 't', line: 9, specifier: 's' },
        { fromPath: 'src/a.ts', toPath: 't', line: 40, specifier: 's' }
      ]
    }),
    v({
      subjectId: 'edge:a',
      status: 'absent',
      offending: [
        { fromPath: 'src/a.ts', toPath: 't', line: 2, specifier: '' }
      ]
    }),
    v({ subjectId: 'edge:unknown', status: 'unverifiable' })
  ];

  it('flattens one row per offending line and drops passing verdicts', () => {
    const rows = archDivergences(verdicts);
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.status !== 'convergent')).toBe(true);
  });

  it('is deterministic, so two runs draw the same list in the same order', () => {
    const a = archDivergences(verdicts);
    const b = archDivergences([...verdicts].reverse());
    expect(a).toEqual(b);
    expect(a.map((r) => `${r.path}:${String(r.line)}`)).toEqual([
      'src/a.ts:2',
      'src/a.ts:40',
      'src/z.ts:9'
    ]);
  });

  it('answers what broke in one file', () => {
    const rows = archDivergences(verdicts);
    expect(divergencesForPath(rows, 'src/a.ts')).toHaveLength(2);
    expect(divergencesForPath(rows, 'src/nothing.ts')).toHaveLength(0);
  });

  it('is empty when nothing has been checked, so the section is not drawn', () => {
    expect(archDivergences([])).toEqual([]);
  });
});

describe('the freshness ribbon', () => {
  const nameOf = (id: string): string => (id === 'tmux' ? 'tmux layer' : id);

  it('says nothing moved when nothing did', () => {
    expect(
      freshnessSentence(
        [{ componentId: 'tmux', commitsBehind: 0, uncommittedFiles: 0 }],
        nameOf
      )
    ).toBe(
      'Nothing has landed under these promises since the contract last changed.'
    );
  });

  it('names the worst part rather than adding the counts together', () => {
    const line = freshnessSentence(
      [
        { componentId: 'tmux', commitsBehind: 26, uncommittedFiles: 0 },
        { componentId: 'ripgrep', commitsBehind: 4, uncommittedFiles: 0 }
      ],
      nameOf
    );
    expect(line).toContain('2 of 2 parts');
    expect(line).toContain('tmux layer by 26');
    // 30 would be the sum, and it would double count every commit that touched
    // both parts. It must never appear.
    expect(line).not.toContain('30');
  });

  it('adds the uncommitted clause, because a dirty tree is a different claim', () => {
    const line = freshnessSentence(
      [{ componentId: 'tmux', commitsBehind: 26, uncommittedFiles: 3 }],
      nameOf
    );
    expect(line).toContain('3 changed files');
    expect(line).toContain('rather than against HEAD');
  });
});

describe('the seeding prompt', () => {
  it('is byte deterministic for one repository', () => {
    expect(seedPromptText('/repo')).toBe(seedPromptText('/repo'));
  });

  it('names the repository exactly once', () => {
    const text = seedPromptText('/Users/x/thing');
    expect(text.split('/Users/x/thing')).toHaveLength(2);
  });

  it('carries the promise count, so an agent does not write forty', () => {
    expect(seedPromptText('/repo')).toContain('5 to 10');
  });

  it('forbids writing the baseline, which only a person may add to', () => {
    expect(seedPromptText('/repo')).toContain(
      'Do not write docs/arch/baseline.json'
    );
  });

  it('names a document to convert before it names the repository', () => {
    const text = seedPromptText('/repo');
    expect(text.indexOf('AS-BUILT-ARCHITECTURE.md')).toBeLessThan(
      text.indexOf('read the repository itself')
    );
  });
});

describe('the refusals, kept executable rather than only written down', () => {
  /** Every source file this view ships, read as text. */
  const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
  const files = readdirSync(DIR)
    .filter((f) => f.endsWith('.ts') || f.endsWith('.tsx'))
    .map((f) => ({ name: f, text: readFileSync(join(DIR, f), 'utf8') }));

  it('ships more than a handful of files, so the scan below is not vacuous', () => {
    expect(files.length).toBeGreaterThan(5);
  });

  it('renders prose as plain text: no raw HTML anywhere in the view', () => {
    // THIS IS THE LOAD-BEARING ONE. Every string this view draws comes out of
    // a file under `docs/arch/`, and an agent can write that file. `rehype-raw`
    // is in this product's dependency tree and the editor's markdown pipeline
    // uses it, so a later round reaching for that pipeline here would render
    // raw HTML an agent wrote, inside the one renderer whose CSP Phase 23
    // refusal 7 says is never relaxed. The comment saying so is not a guard.
    // This is.
    for (const f of files) {
      const code = f.text.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code, f.name).not.toContain('dangerouslySetInnerHTML');
      expect(code, f.name).not.toContain('innerHTML');
      expect(code, f.name).not.toMatch(/from '.*markdown/);
      expect(code, f.name).not.toMatch(/from '.*rehype/);
      expect(code, f.name).not.toMatch(/from '.*remark/);
    }
  });

  it('never sets a session status and never reaches the sessions slice to write', () => {
    for (const f of files) {
      const code = f.text.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code, f.name).not.toContain('applySessionStatus');
      expect(code, f.name).not.toContain('setSessionStatus');
      expect(code, f.name).not.toContain('needs_input');
    }
  });

  it('adds no rendering package, because this phase ships no canvas', () => {
    for (const f of files) {
      const code = f.text.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code, f.name).not.toContain('@xyflow');
      expect(code, f.name).not.toContain('dagre');
    }
  });

  it('never writes any file under docs/arch, baseline.json least of all', () => {
    // The one write the drafting gesture makes is `fs.createFolder`, and it is
    // named here rather than banned, because a person's first Save fails on a
    // folder that has never existed. `writeFile` under this folder would mean
    // Tortie recording a contract, and recording one is a person's decision.
    for (const f of files) {
      const code = f.text.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code, f.name).not.toContain('fs.writeFile');
      expect(code, f.name).not.toContain('createFile');
      // `seed-prompt.ts` is the ONE file allowed to say the name, and it says
      // it to forbid it: the prompt's last line tells the agent not to write
      // that file. Every other file naming it would be a code path towards it.
      if (f.name !== 'seed-prompt.ts') {
        expect(code, f.name).not.toContain('baseline.json');
      }
    }
  });

  it('tells the agent not to write the baseline, in the prompt itself', () => {
    expect(seedPromptText('/repo')).toContain(
      'Do not write docs/arch/baseline.json'
    );
  });

  it('sends nothing to a session: that verb belongs to a later slice', () => {
    for (const f of files) {
      const code = f.text.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code, f.name).not.toContain('sendInput');
      expect(code, f.name).not.toContain('load-buffer');
      expect(code, f.name).not.toContain('paste-buffer');
    }
  });
});
