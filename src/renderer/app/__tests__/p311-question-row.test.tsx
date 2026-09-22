/**
 * Phase 311 — the ⌘J row says what the agent is asking.
 *
 * The defect is one line of the row. `.attention-excerpt` drew the last inked
 * line of the session's screen, and for every committed Claude dialog that line
 * is the hint row, `Esc to cancel · Tab to amend`, while the question the agent
 * asked sits five lines above it. The question already reached main twice and
 * was dropped twice; main now composes it and the row draws it.
 *
 * What this file holds:
 * - The row draws the question when there is one and the excerpt when there is
 *   not, in ONE span, so the stylesheet does not move.
 * - The committed fixture's own hint row is what a row falls back to, so the
 *   parent reading is in this file as a literal rather than as a claim.
 * - `data-question` says which of the two is on screen, which is what the app
 *   run reads off the drawn row.
 * - THE FIELD IS NOT A STATUS. `SessionStatus` gains no member, the store's
 *   record reaches no dot, and no file that reads it calls `statusVisual`.
 *
 * The vitest environment is node and this repository has no jsdom, so the row's
 * contents are a pure component that takes what it draws, which is the shape
 * Phase 93 gave it and the reason a test can read the markup a person sees.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Session } from '@shared/types';

const HERE = dirname(fileURLToPath(import.meta.url));

// The store reads window.gmux while zustand builds its initial state, so the
// globals have to exist before the modules under test are ever imported.
vi.stubGlobal('window', {
  addEventListener() {},
  removeEventListener() {},
  setTimeout,
  clearTimeout,
  gmux: {
    sessions: {
      restore: () => Promise.resolve({}),
      discard: () => Promise.resolve()
    },
    setSessionsPosition: () => Promise.resolve()
  }
});
vi.stubGlobal('localStorage', {
  getItem: () => null,
  setItem() {},
  removeItem() {}
});
vi.stubGlobal('document', {
  body: { classList: { add() {}, remove() {}, contains: () => false } },
  documentElement: { style: { setProperty() {} } },
  querySelector: () => null,
  addEventListener() {},
  removeEventListener() {}
});

const { AttentionRowBody, attentionRowLabel } = await import(
  '../AttentionOverlay'
);

function session(over: Partial<Session> = {}): Session {
  return {
    id: 's1',
    name: 'fix-login',
    tmuxName: 'fix-login',
    projectPath: '/Users/gdc/gmux',
    cwd: '/Users/gdc/gmux',
    agent: 'claude',
    status: 'needs_input',
    createdAt: 1,
    ...over
  } as Session;
}

/**
 * The parent reading, from `claude-permission-prompt.txt` line 23, which is what
 * `excerptFromCapture` returns for that fixture and therefore what the row drew
 * before this phase.
 */
const HINT_ROW = 'Esc to cancel · Tab to amend';

/** The question from line 18 of the same fixture, which is what main now sends. */
const QUESTION = 'Do you want to make this edit to note.txt?';

const visible = (html: string): string => html.replace(/<[^>]*>/g, '');

describe('which line the row draws', () => {
  it('draws the excerpt when main has no question, exactly as it always did', () => {
    const html = renderToStaticMarkup(
      <AttentionRowBody session={session()} excerpt={HINT_ROW} age="4m" />
    );
    expect(visible(html)).toContain(HINT_ROW);
    expect(html).toContain('attention-excerpt');
    // Nothing says a question is on screen, because none is.
    expect(html).not.toContain('data-question');
  });

  it('draws the question instead when main has one', () => {
    const html = renderToStaticMarkup(
      <AttentionRowBody
        session={session()}
        excerpt={HINT_ROW}
        question={QUESTION}
        age="4m"
      />
    );
    expect(visible(html)).toContain(QUESTION);
    // The hint row is GONE from the row, which is the whole point.
    expect(visible(html)).not.toContain(HINT_ROW);
    expect(html).toContain('data-question');
  });

  it('keeps one span, so no stylesheet rule moves', () => {
    const html = renderToStaticMarkup(
      <AttentionRowBody
        session={session()}
        excerpt={HINT_ROW}
        question={QUESTION}
        age="4m"
      />
    );
    const spans = html.match(/attention-excerpt/g) ?? [];
    expect(spans.length).toBe(1);
  });

  it('falls back to the excerpt for an empty question', () => {
    const html = renderToStaticMarkup(
      <AttentionRowBody
        session={session()}
        excerpt={HINT_ROW}
        question=""
        age="4m"
      />
    );
    expect(visible(html)).toContain(HINT_ROW);
    expect(html).not.toContain('data-question');
  });

  it('draws the row at all when neither is there', () => {
    const html = renderToStaticMarkup(
      <AttentionRowBody session={session()} excerpt="" age="now" />
    );
    expect(visible(html)).toContain('fix-login');
    expect(visible(html)).toContain('~/gmux');
  });

  it('draws the question verbatim, composing and trimming nothing', () => {
    // Main redacts and clips. The row is not a second editor of the person's
    // words, because two clips disagree the first time one of them moves.
    const odd = 'Run  rm -rf build   ?';
    const html = renderToStaticMarkup(
      <AttentionRowBody
        session={session()}
        excerpt={HINT_ROW}
        question={odd}
        age="4m"
      />
    );
    expect(visible(html)).toContain(odd);
  });
});

// ---------------------------------------------------------------------------
// THE FIX ROUND. The verifier measured the drawn span at the shipped width:
// about 152px, roughly twenty characters of a question that may be two hundred,
// tail-truncated with an ellipsis. The row is the right shape and the wrong
// place to read a sentence, so the WHOLE of the question has to be reachable —
// which is what the row's own label already does for the whole folder path.
// ---------------------------------------------------------------------------

describe('the whole question is reachable on the row', () => {
  it('is in the accessible name and the tooltip when there is one', () => {
    const label = attentionRowLabel(session(), QUESTION);
    expect(label).toBe(`fix-login in ~/gmux · ${QUESTION}`);
  });

  it('holds a question far longer than the span can draw, whole', () => {
    // main's cap is 200 characters and the span draws about twenty of them.
    const long = `Edit ${'/deeply-nested-directory'.repeat(7)}/note.txt`;
    expect(long.length).toBeGreaterThan(150);
    expect(attentionRowLabel(session(), long)).toContain(long);
  });

  it('says exactly what it said before this phase when there is none', () => {
    // The no-regression row: every session of the other fourteen agents, and
    // every Claude session that is not sitting at a dialog.
    expect(attentionRowLabel(session())).toBe('fix-login in ~/gmux');
    expect(attentionRowLabel(session(), '')).toBe('fix-login in ~/gmux');
  });

  it('keeps the machine clause, and puts the question after it', () => {
    const remote = session({
      machine: { id: 'm1', label: 'Mac Pro' }
    } as Partial<Session>);
    // A remote folder keeps its absolute spelling — the tilde is this Mac's.
    expect(attentionRowLabel(remote, QUESTION)).toBe(
      `fix-login in /Users/gdc/gmux on Mac Pro · ${QUESTION}`
    );
  });
});

// ---------------------------------------------------------------------------
// It is not a status, read from the sources
// ---------------------------------------------------------------------------

describe('the field is not a status and never becomes one', () => {
  const read = (rel: string): string =>
    readFileSync(resolve(HERE, rel), 'utf8');

  const contract = read('../../../shared/ipc/sessions.ts');
  const types = read('../../../shared/types.ts');
  const slice = read('../../state/sessions-slice.ts');
  const subs = read('../../state/subscriptions.ts');
  const panel = read('../AttentionOverlay.tsx');
  const lines = read('../../overview/ProjectLines.tsx');

  it('says so on the contract, in the words Phase 141 used', () => {
    const at = contract.indexOf('question?: string;');
    expect(at, 'the field is missing from the activity payload').toBeGreaterThan(
      -1
    );
    const doc = contract.slice(contract.indexOf('PHASE 311', 0), at);
    expect(doc).toContain('IT IS NOT A STATUS AND IT NEVER BECOMES ONE');
    expect(doc).toContain('`SessionStatus` gains no');
    expect(doc).toContain('Absent means this update carries no news');
  });

  it('adds no member to SessionStatus', () => {
    // `SessionStatus` is derived from SESSION_STATUSES, so the members are in
    // that array and this reads the array rather than the alias line, which
    // names none of them. The seven are pinned by their full list: a status
    // added for this phase fails here, and so does one quietly renamed.
    const at = types.indexOf('export const SESSION_STATUSES = [');
    expect(at, 'SESSION_STATUSES has moved or been renamed').toBeGreaterThan(-1);
    const list = types.slice(at, types.indexOf('] as const;', at));
    const members = [...list.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]);
    expect(members).toEqual([
      'running',
      'idle',
      'needs_input',
      'exited',
      'restorable',
      'unknown',
      'discarded'
    ]);
  });

  it('carries the same sentence on the store record', () => {
    const at = slice.indexOf('questions: Record<string, string>;');
    expect(at).toBeGreaterThan(-1);
    const doc = slice.slice(slice.indexOf('PHASE 311'), at);
    expect(doc).toContain('IT IS NOT A STATUS AND IT NEVER BECOMES ONE');
    expect(doc).toContain('statusVisual');
  });

  it('never reaches a dot, a status word or statusVisual', () => {
    // The panel reads the record and draws a line with it. Nothing on that
    // path may consult or produce a status from it.
    for (const [name, source] of [
      ['subscriptions.ts', subs],
      ['AttentionOverlay.tsx', panel]
    ] as const) {
      expect(source, `${name} draws a status from the question`).not.toMatch(
        /questions?\[[^\]]*\][^\n]*statusVisual/
      );
      expect(source).not.toMatch(/statusVisual[^\n]*questions?\[/);
    }
    // The one file that reads a status beside the question reads it to decide
    // WHETHER to draw, never to decide what the status is.
    expect(lines).toContain("status === 'needs_input'");
    expect(lines).not.toMatch(/statusVisual\([^)]*question/);
  });

  it('applies the question on the activity channel and nowhere else', () => {
    // One writer. A second road into the record is how a per session fact
    // becomes a status by accident.
    const writes = subs.match(/questions\[u\.sessionId\] = /g) ?? [];
    expect(writes.length).toBe(1);
    expect(subs).toContain('u.question !== undefined');
    // An empty string clears rather than storing a blank question.
    expect(subs).toContain('delete questions[u.sessionId]');
  });
});
