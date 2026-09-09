/**
 * PHASE 235's FIX ROUND — the guided fix's Open Folder button on a machine.
 *
 * ## What was wrong, and it was the same wrong answer item 1 removed
 *
 * Research 85 recorded Reveal as "held in three places and lost in a fourth",
 * and the verifier of this phase re-derived that count as THREE OF FIVE. The
 * two nobody had asked about are the guided fix beside a broken Context row
 * (`ContextView.tsx`) and the detail card (`ContextDetailTab.tsx`), and the
 * first of them is reachable:
 *
 *  - `src/main/context/resolve.ts` fills `ContextProblem.revealDir` with
 *    `dirname(sourcePath)` for a skill whose folder does not match its declared
 *    name, and `scan.ts` pushes exactly those problems onto the result.
 *  - `src/main/machines/remote-agent-context.ts` reads a MACHINE's Context
 *    through that SAME `scanContext`, over a recording fs, and the answer
 *    carries the same `ContextScanResult`, so `revealDir` is a folder on the
 *    other computer.
 *  - `ContextView`'s store puts that scan's `problems` on the face, and the
 *    button called `menuDeps.revealPath` with no remote term anywhere in it,
 *    while `menuDeps.remote` gated only the row and group menus.
 *
 * Both machines' home is `/Users/gdc`, so `fs:reveal` opened Finder HERE on
 * whatever sits at the same path — the wrong folder rather than nothing.
 *
 * ## What this pins
 *
 * 1. `problemRevealDir`, the one place that decides it, over the four shapes.
 * 2. That the button is composed FROM it, read out of `ContextView.tsx`'s own
 *    source, because a pure function nothing calls is exactly the defect. The
 *    scanner is proved on the parent's own spelling first, so a scan that
 *    cannot fail is never mistaken for a scan that passed.
 * 3. That `ContextDetailTab` gates its `onRevealPath` on the same fact. That
 *    door is UNREACHABLE today and the measurement is in that file's own
 *    header: every open in `ContextView` returns on `cwd === null`, which is
 *    exactly the remote targets. The guard is pinned anyway, because the fact
 *    is the tab's and a later round that opens the tab from a remote row must
 *    not re-open the door.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ContextProblem } from '../model';
import { problemRevealDir } from '../menus';

const HERE = resolve(import.meta.dirname, '..');

/** The naming problem `resolve.ts` composes, with its far-side folder. */
const naming: ContextProblem = {
  path: '/Users/gdc/api/.claude/skills/reviewer/SKILL.md',
  line: null,
  message: 'This skill is named review but its folder is reviewer.',
  kind: 'invalid',
  category: 'skill',
  fix: 'Rename the folder to review, or edit the name in SKILL.md to reviewer.',
  revealDir: '/Users/gdc/api/.claude/skills/reviewer'
};

/** A parse error, which carries no fix and so no folder to open. */
const parse: ContextProblem = {
  path: '/Users/gdc/api/.claude/settings.json',
  line: 12,
  message: 'settings.json would not parse.',
  kind: 'parse',
  category: null
};

describe('the folder the guided fix would open', () => {
  it('is the problem’s own folder on this Mac', () => {
    expect(problemRevealDir(naming, false)).toBe(
      '/Users/gdc/api/.claude/skills/reviewer'
    );
  });

  it('is NOTHING on a machine, so no button is built at all', () => {
    expect(problemRevealDir(naming, true)).toBeUndefined();
  });

  it('is nothing for a problem that carries no folder, on either', () => {
    expect(problemRevealDir(parse, false)).toBeUndefined();
    expect(problemRevealDir(parse, true)).toBeUndefined();
  });

  it('never invents one, so the button can never reveal an empty path', () => {
    for (const remote of [false, true]) {
      const answer = problemRevealDir({ ...naming, revealDir: undefined }, remote);
      expect(answer).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// The wiring, read out of the real source
// ---------------------------------------------------------------------------

/**
 * True when a source text builds its Open Folder button from `problemRevealDir`
 * rather than from the raw field.
 */
function composedFromTheDecision(source: string): boolean {
  if (!source.includes('problemRevealDir(')) return false;
  // The raw field may still be READ inside menus.ts's own decision, but never
  // in the view's button, so the view may not name it beside Open Folder.
  // The LAST one: the Phase 26.2 comment above the row names the button too,
  // and the button's own label is what this reads back from.
  const at = source.lastIndexOf('Open Folder');
  if (at === -1) return false;
  const around = source.slice(Math.max(0, at - 700), at);
  return around.includes('revealDir') && !around.includes('problem.revealDir');
}

describe('the view composes the button from that one decision', () => {
  const view = readFileSync(resolve(HERE, 'ContextView.tsx'), 'utf8');

  it('and the scanner fails on the spelling that actually shipped', () => {
    const parentSpelling = `
      {problem.revealDir !== undefined ? (
        <button onClick={() => onRevealDir(problem.revealDir ?? '')}>
          Open Folder
        </button>
      ) : null}`;
    expect(composedFromTheDecision(parentSpelling)).toBe(false);
    expect(composedFromTheDecision('problemRevealDir(problem, remote);')).toBe(
      false
    );
  });

  it('reads the folder through problemRevealDir and passes the tab’s own remote', () => {
    expect(composedFromTheDecision(view)).toBe(true);
    expect(view).toContain('remote={remote}');
  });
});

describe('the detail card asks the same question', () => {
  const tab = readFileSync(resolve(HERE, 'ContextDetailTab.tsx'), 'utf8');

  it('builds no reveal for a tab whose file is on a machine', () => {
    expect(tab).toContain('{...(!remote && canReveal()');
  });

  it('and the panel hands it the tab’s own fact', () => {
    const panel = readFileSync(
      resolve(HERE, '../editor/EditorPanel.tsx'),
      'utf8'
    );
    expect(panel).toContain('remote={activeTab.remote !== undefined}');
  });
});
