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
 * the same order, and, since Phase 158, that the one path in stays one path
 * and the accept verb composes exactly what the failing row shows.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { ArchVerdict } from '@shared/arch';
import { archDivergences, divergencesForPath } from '../divergences';
import {
  acceptEdgeId,
  canAcceptOffence,
  isFailure,
  paintedSentence,
  passDetail,
  passLead,
  stripLanes,
  timeWord,
  verdictClass,
  verdictIcon
} from '../ArchView';
import { passSentence } from '../ArchEmptyState';
import type { ArchPassRunFace, ArchPassStatusResult } from '../bridge';
import {
  ARCH_CHECKS_HOLD_WORD,
  ARCH_PASS_OFF,
  ARCH_PASS_QUIET,
  ARCH_PASS_REFUSED,
  ARCH_PASS_RUNNING,
  archProblemsSummary,
  archUnreadableClause,
  freshnessSentence,
  unresolvedSentence,
  verdictWord
} from '../copy';

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

  it('stops calling quotes promises when there are zero edges (Phase 178)', () => {
    // Research 71 section 5: "9 checked and holds" over an empty edges.json,
    // where the nine were surviving evidence quotes. With zero promises the
    // held lane wears its own word, and the numbers themselves do not move.
    const counts = {
      checkedHold: 9,
      broke: 0,
      cannotCheck: 0,
      accepted: 0,
      unresolvedImports: 47,
      totalImports: 382
    };
    const plain = stripLanes(counts);
    const honest = stripLanes(counts, true);
    expect(plain[0]?.word).toContain('checked and');
    expect(honest[0]?.word).toBe(ARCH_CHECKS_HOLD_WORD);
    expect(honest[0]?.word).not.toContain('promise hold');
    // Only the held lane's word moves; broke and cannot keep their words.
    expect(honest.slice(1)).toEqual(plain.slice(1));
    expect(honest.map((l) => l.n)).toEqual(plain.map((l) => l.n));
  });

  it('folds the would-not-load wall to one line and one clause (Phase 178)', () => {
    expect(archProblemsSummary(1)).toBe('1 file would not load.');
    expect(archProblemsSummary(17)).toBe('17 files would not load.');
    expect(archUnreadableClause(1)).toBe('1 file of it would not load.');
    expect(archUnreadableClause(17)).toBe('17 files of it would not load.');
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

describe('the accept verb composes exactly what the failing row shows', () => {
  it('reads the promise id out of an edge subject, facet or none', () => {
    expect(acceptEdgeId('edge:scm-no-terminal')).toBe('scm-no-terminal');
    expect(acceptEdgeId('edge:scm-no-terminal#freshness')).toBe(
      'scm-no-terminal'
    );
    // A component's divergence has no promise id, and the baseline row then
    // matches by path pair alone, which is the checker's own rule.
    expect(acceptEdgeId('component:tmux-layer')).toBeUndefined();
    expect(acceptEdgeId('gap:tmux-layer:0')).toBeUndefined();
    expect(acceptEdgeId('edge:')).toBeUndefined();
  });

  it('offers no button on an offence a baseline row could never match', () => {
    expect(canAcceptOffence({ fromPath: 'src/a.ts', toPath: 'src/b.ts' })).toBe(
      true
    );
    // The absent-component shape: a fromPath and no target at all.
    expect(canAcceptOffence({ fromPath: 'src/a.ts', toPath: '' })).toBe(false);
    expect(canAcceptOffence({ fromPath: '', toPath: 'src/b.ts' })).toBe(false);
  });

  it('offers no second button on an offence a baseline row already covers', () => {
    // The verifier pressed Accept on one offence of nine and found nine
    // buttons still there. An accepted offence carries the reason and gets
    // the word instead of the control.
    expect(
      canAcceptOffence({
        fromPath: 'src/a.ts',
        toPath: 'vendor/b.ts',
        accepted: 'The vendored parser is allowed for now.'
      })
    ).toBe(false);
  });
});

describe('the run face (Phase 158)', () => {
  function run(over: Partial<ArchPassRunFace>): ArchPassRunFace {
    return {
      verdict: 'kept',
      reason: null,
      detail: null,
      agentId: 'claude',
      model: 'claude-haiku-4-5-20251001',
      startedAt: new Date(2026, 7, 28, 14, 2).getTime(),
      wallMs: 0,
      painted: 7,
      groupsTotal: 9,
      scope: null,
      trigger: null,
      components: 9,
      suggestions: [],
      ...over
    };
  }

  function status(over: Partial<ArchPassStatusResult>): ArchPassStatusResult {
    return {
      cwd: '/repo',
      running: false,
      suspended: null,
      chosen: true,
      lastRun: null,
      ...over
    };
  }

  it('says the clock word with two digits each side', () => {
    const noon = new Date(2026, 7, 28, 9, 5).getTime();
    expect(timeWord(noon)).toBe('09:05');
  });

  it('counts painted coverage as boxes against enriched parts', () => {
    expect(paintedSentence(run({}))).toBe('Painted 7 of 9 parts on the map.');
    // A refused run has no counts and the face says nothing about painting.
    expect(
      paintedSentence(run({ verdict: 'refused', painted: null, components: null }))
    ).toBeNull();
  });

  it('leads with running while the pass runs', () => {
    expect(passLead(status({ running: true }), null)).toBe(ARCH_PASS_RUNNING);
  });

  it('says a refused run wrote nothing, and names the refusal', () => {
    const lead = passLead(
      status({ lastRun: run({ verdict: 'refused', reason: 'invented-number' }) }),
      null
    );
    expect(lead).toContain(ARCH_PASS_REFUSED);
    expect(lead).toContain('invented-number');
    // Refused with no name still says the load-bearing part.
    expect(
      passLead(status({ lastRun: run({ verdict: 'refused', reason: null }) }), null)
    ).toBe(ARCH_PASS_REFUSED);
  });

  it('names the refusal that stopped a gesture before any spawn', () => {
    const lead = passLead(status({}), 'not-confirmed');
    expect(lead).toContain('not confirmed in Settings');
    // An unknown token still gets an honest sentence with the token named.
    expect(passLead(status({}), 'strange-token')).toContain('strange-token');
  });

  it('says when the contract was last written after a kept run', () => {
    expect(
      passLead(status({ lastRun: run({ wallMs: 60_000 }) }), null)
    ).toBe('The contract was last written at 14:03.');
  });

  it('does not lead plain and kept over an unreadable contract (Phase 178)', () => {
    // A kept run whose contract cannot be read back whole says so in the same
    // breath as the written time, never a happy sentence standing alone.
    expect(
      passLead(status({ lastRun: run({ wallMs: 60_000 }) }), null, 17)
    ).toBe(
      'The contract was last written at 14:03. 17 files of it would not load.'
    );
    // Zero unreadable files changes nothing, so every earlier caller stands.
    expect(
      passLead(status({ lastRun: run({ wallMs: 60_000 }) }), null, 0)
    ).toBe('The contract was last written at 14:03.');
  });

  it('has nothing to say before the pass has ever run', () => {
    expect(passLead(status({}), null)).toBeNull();
  });

  it('keeps the written time beside a suspension after a kept run', () => {
    const lead = passLead(
      status({
        suspended: 'Your usage window is close to its limit.',
        lastRun: run({ wallMs: 60_000 })
      }),
      null
    );
    expect(lead).toBe(
      'Your usage window is close to its limit. The contract was last written at 14:03.'
    );
    // With no kept run behind it the suspension stands alone.
    expect(passLead(status({ suspended: 'Paused.' }), null)).toBe('Paused.');
  });

  it('puts the validator own sentence under a refused run, and only there', () => {
    const detail =
      'answer:components[5] component.anchors[0] contains a step back up out of the repository';
    const refused = status({
      lastRun: run({ verdict: 'refused', reason: 'anchors-changed', detail })
    });
    expect(passDetail(refused)).toBe(detail);
    // A kept run has no refusal to explain; a running pass says running.
    expect(passDetail(status({ lastRun: run({}) }))).toBeNull();
    expect(passDetail({ ...refused, running: true })).toBeNull();
    // An older row that never carried the sentence still draws nothing extra.
    expect(
      passDetail(
        status({ lastRun: run({ verdict: 'refused', reason: 'bad-shape', detail: null }) })
      )
    ).toBeNull();
  });

  it('promises the pass only when an agent is picked, and says off plainly', () => {
    expect(passSentence(true, true)).toBe(ARCH_PASS_QUIET);
    expect(passSentence(true, false)).toBe(ARCH_PASS_OFF);
    // A build with no pass half says nothing about a pass at all.
    expect(passSentence(false, false)).toBeNull();
    expect(passSentence(false, true)).toBeNull();
  });
});

describe('the writing rules on every Phase 158 sentence', () => {
  it('uses no em dash and no en dash, and no tmux vocabulary', async () => {
    const copy = await import('../copy');
    const sentences = [
      copy.ARCH_DRAFT_TITLE,
      copy.ARCH_DRAFT_BODY,
      copy.ARCH_PASS_QUIET,
      copy.ARCH_PASS_OFF,
      copy.ARCH_PASS_TITLE,
      copy.ARCH_ENRICH_TITLE,
      copy.ARCH_ENRICH_BODY,
      copy.ARCH_PASS_RUNNING,
      copy.ARCH_PASS_REFUSED,
      copy.ARCH_PASS_FAILED,
      copy.ARCH_PASS_SUSPENDED,
      copy.ARCH_PASS_SUGGESTIONS,
      copy.ARCH_PASS_SUGGESTIONS_NOTE,
      copy.ARCH_ACCEPT_TITLE,
      copy.ARCH_ACCEPT_BODY,
      copy.ARCH_ACCEPT_REASON_LABEL,
      copy.ARCH_ACCEPT_WRITE,
      copy.ARCH_ACCEPTED_NOTE,
      copy.ARCH_EMPTY_BODY,
      copy.ARCH_EMPTY_MORE,
      copy.ARCH_EMPTY_LONG,
      copy.enrichRefusalSentence('no-choice'),
      copy.enrichRefusalSentence('not-confirmed'),
      copy.enrichRefusalSentence('no-recipe'),
      copy.enrichRefusalSentence('in-flight'),
      copy.enrichRefusalSentence('suspended'),
      copy.enrichRefusalSentence('anything-else')
    ];
    for (const sentence of sentences) {
      expect(sentence).not.toMatch(/[–—]/);
      expect(sentence.toLowerCase()).not.toMatch(/\bpane\b|\btmux\b|prefix/);
    }
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

  it('writes no file from this folder: every write is an ask to main', () => {
    // PHASE 158 REWROTE THIS TEST DELIBERATELY, AND DID NOT DELETE IT. The
    // old rule was "Tortie never writes docs/arch". The operator amended it:
    // the seed writes directly, and accepting a divergence is a button. What
    // survives, and what this scans for, is that the RENDERER still writes
    // nothing itself: no fs write verb, no folder creation, no path
    // composition toward a contract file. Asking main over the typed bridge
    // is the only shape a write may take, and main validates whole behind
    // its own gate.
    for (const f of files) {
      const code = f.text.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code, f.name).not.toContain('fs.writeFile');
      expect(code, f.name).not.toContain('writeFile(');
      expect(code, f.name).not.toContain('createFile');
      expect(code, f.name).not.toContain('createFolder');
      // `copy.ts` is the ONE file allowed to say the baseline's name, and it
      // says it to a person: the accept control names the file it writes
      // before it is pressed. Every other file naming it would be a second
      // code path toward that file.
      if (f.name !== 'copy.ts') {
        expect(code, f.name).not.toContain('baseline.json');
      }
    }
  });

  it('keeps one path in: no pasted prompt and no clipboard anywhere', () => {
    // The paste-a-prompt fork was DELETED in Phase 158, the operator's own
    // ruling that the fork itself was the defect. This is the line that
    // stops it growing back: nothing in this folder composes a prompt for a
    // person to paste, and nothing here reaches the clipboard at all.
    expect(files.some((f) => f.name === 'seed-prompt.ts')).toBe(false);
    for (const f of files) {
      const code = f.text.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code, f.name).not.toContain('seedPromptText');
      expect(code, f.name).not.toContain('navigator.clipboard');
      expect(code, f.name).not.toContain('CANDIDATE_DOCS');
    }
  });

  /**
   * PHASE 64 REWROTE THIS TEST DELIBERATELY, AND DID NOT DELETE IT.
   *
   * Phase 63 wrote it as "sends nothing to a session: that verb belongs to a
   * later slice", scanning for three strings. Phase 64 IS that later slice, so
   * one third of it had to change and two thirds became stronger rather than
   * weaker.
   *
   * `load-buffer` and `paste-buffer` stay forbidden FOREVER, and that is now a
   * ruling rather than a deferral. Research 49 guessed that insertion would go
   * through them. It does not, and it never will from this folder. They appear
   * in this repository at exactly one place, `src/main/machines/
   * remote-capsule.ts`, and there they are REFUSED, because bytes pasted into a
   * pane arrive as pane input and a shell executes them.
   *
   * `sendInput` is replaced rather than dropped. The old line banned every
   * write; the new one bans every write that does not go through the one door.
   * `../deliver.ts` may reach the drop module's own primitive and no other file
   * here may write to a session at all, so a later round that adds a second
   * send has to add it to a file this test names.
   */
  it('sends to a session only through the one guarded door', () => {
    for (const f of files) {
      const code = f.text.replace(/\/\*[\s\S]*?\*\//g, '');
      // The tmux paste path, refused for good.
      expect(code, f.name).not.toContain('load-buffer');
      expect(code, f.name).not.toContain('paste-buffer');
      // The bridge write that goes around the Phase 67 `unknown` refusal.
      expect(code, f.name).not.toContain('sendInput');
      if (f.name === 'deliver.ts') continue;
      // Nothing else in this folder may put bytes into a session by any name.
      expect(code, f.name).not.toContain('insertBlock');
      expect(code, f.name).not.toContain('insertReferences');
      expect(code, f.name).not.toContain('.paste(');
    }
  });

  it('keeps the delivery guard in one file, so there is one thing to remove', () => {
    const guarded = files.filter((f) =>
      f.text.replace(/\/\*[\s\S]*?\*\//g, '').includes('export function canDeliverTo')
    );
    expect(guarded.map((f) => f.name)).toEqual(['deliver.ts']);
  });

  it('draws no menu in the DOM: the picker composes a spec and nothing else', () => {
    const picker = files.find((f) => f.name === 'picker.ts');
    expect(picker).toBeDefined();
    const code = (picker?.text ?? '').replace(/\/\*[\s\S]*?\*\//g, '');
    // It reaches the store's setMenu, the one door on to ui:popupMenu.
    expect(code).toContain('setMenu(');
    // And it renders nothing itself.
    expect(code).not.toContain('createElement');
    expect(code).not.toContain('<div');
    expect(code).not.toContain('document.createElement');
  });

  it('never presses Return for the person', () => {
    for (const f of files) {
      const code = f.text.replace(/\/\*[\s\S]*?\*\//g, '');
      expect(code, f.name).not.toContain("'Enter'");
      expect(code, f.name).not.toContain('\\r');
      expect(code, f.name).not.toContain('send-keys');
    }
  });
});

describe('the copy ruling (2026-08-28), kept executable', () => {
  /**
   * THE RULE: the resting face carries just enough words. Every sentence
   * that renders at rest stays a one liner, and every longer explanation
   * lives on a hover title or behind the one collapsed disclosure. The
   * numbers here are a budget, not a target: a later round that grows a
   * resting sentence back into a paragraph fails this suite before the
   * operator sees it.
   */
  const words = (s: string): number =>
    s.split(/\s+/).filter((w) => w.length > 0).length;

  it('keeps every resting sentence a one liner', async () => {
    const copy = await import('../copy');
    const resting: Array<[string, string]> = [
      ['ARCH_EMPTY_BODY', copy.ARCH_EMPTY_BODY],
      ['ARCH_CONTRACT_ADDS', copy.ARCH_CONTRACT_ADDS],
      ['ARCH_PASS_QUIET', copy.ARCH_PASS_QUIET],
      ['ARCH_PASS_OFF', copy.ARCH_PASS_OFF],
      ['ARCH_PASS_RUNNING', copy.ARCH_PASS_RUNNING],
      ['ARCH_PASS_REFUSED', copy.ARCH_PASS_REFUSED],
      ['ARCH_PASS_FAILED', copy.ARCH_PASS_FAILED],
      ['ARCH_PASS_SUSPENDED', copy.ARCH_PASS_SUSPENDED],
      ['ARCH_PASS_SUGGESTIONS_NOTE', copy.ARCH_PASS_SUGGESTIONS_NOTE],
      ['ARCH_PROSE_UNVERIFIED', copy.ARCH_PROSE_UNVERIFIED],
      ['ARCH_PARTLY_CHECKED_NOTE', copy.ARCH_PARTLY_CHECKED_NOTE]
    ];
    for (const [name, sentence] of resting) {
      expect(words(sentence), name).toBeLessThanOrEqual(14);
    }
    // Labels are labels: a handful of words, never a sentence.
    const labels: Array<[string, string]> = [
      ['ARCH_MAP_OPEN_TITLE', copy.ARCH_MAP_OPEN_TITLE],
      ['ARCH_DRAFT_TITLE', copy.ARCH_DRAFT_TITLE],
      ['ARCH_ENRICH_TITLE', copy.ARCH_ENRICH_TITLE],
      ['ARCH_PASS_TITLE', copy.ARCH_PASS_TITLE],
      ['ARCH_ACCEPT_TITLE', copy.ARCH_ACCEPT_TITLE],
      ['ARCH_ACCEPT_WRITE', copy.ARCH_ACCEPT_WRITE],
      ['ARCH_EMPTY_MORE', copy.ARCH_EMPTY_MORE]
    ];
    for (const [name, label] of labels) {
      expect(words(label), name).toBeLessThanOrEqual(4);
    }
  });

  it('renders the long bodies only on hover titles or behind the disclosure', () => {
    const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
    // Phase 172 moved the faces into subject files, so each body is scanned
    // in the file that draws its button now.
    const offer = readFileSync(join(DIR, 'ArchEmptyState.tsx'), 'utf8');
    const pass = readFileSync(join(DIR, 'ArchPass.tsx'), 'utf8');
    const drill = readFileSync(join(DIR, 'ArchDrill.tsx'), 'utf8');
    const verdicts = readFileSync(join(DIR, 'ArchVerdicts.tsx'), 'utf8');
    // A rendered text node looks like `>{NAME}<` or `{NAME}</`; a hover
    // title looks like `title={NAME}`. The three button bodies and the
    // accepted rule must only ever be the second shape.
    const bodies: [string, string][] = [
      ['ARCH_DRAFT_BODY', offer],
      ['ARCH_ENRICH_BODY', pass],
      ['ARCH_MAP_OPEN_BODY', drill],
      ['ARCH_ACCEPT_BODY', pass],
      ['ARCH_ACCEPTED_NOTE', verdicts]
    ];
    for (const [name, source] of bodies) {
      expect(source, name).not.toContain(`>{${name}}<`);
      expect(source, name).toContain(name);
    }
    // The action buttons carry no visible body span at all any more.
    for (const source of [pass, drill, verdicts, offer]) {
      expect(source).not.toContain('arch-empty-action-body');
    }
    // The teaching paragraph sits inside the one collapsed disclosure.
    const details = offer.slice(offer.indexOf('<details'), offer.indexOf('</details>'));
    expect(details).toContain('{ARCH_EMPTY_LONG}');
    expect(details).toContain('{ARCH_PROMISE_GUIDANCE}');
    expect(offer).not.toMatch(/<details[^>]*\sopen/);
  });

  it('shows running as a spinner beside the heading, state over sentences', () => {
    const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
    const pass = readFileSync(join(DIR, 'ArchPass.tsx'), 'utf8');
    expect(pass).toContain('codicon-modifier-spin');
  });
});
