/**
 * Phase 137.2, Builder B's half, run rather than read where the repository
 * allows it. This repository carries no jsdom, so the components render
 * through `renderToStaticMarkup`, the shape answer-hostile.test.tsx uses,
 * and the live half of the same proof runs in build/probe-p1372-columns.mjs.
 *
 * What is held here:
 *  - a column draws the session's WHOLE turns list, not only the latest
 *    exchange, and the first column wears the focus edge class
 *  - a project row whose session has an agent draws the agent's mark, and a
 *    shell row draws NO icon element at all rather than a placeholder
 *  - the stylesheet gives the column body its own scroller, drops the old
 *    bottom fade, and colors the focus edge with a token
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import type {
  OverviewProject,
  OverviewSessionView,
  OverviewTurnView
} from '@shared/overview';
import { ProjectLines } from '../ProjectLines';
import { SessionColumns } from '../SessionColumns';

const NOW = Date.UTC(2026, 7, 22, 12, 0, 0);

function turn(index: number): OverviewTurnView {
  return {
    index,
    askText: `please do the thing numbered ${String(index)}`,
    askClipped: false,
    askAt: new Date(NOW - (10 - index) * 60_000).toISOString(),
    answerText: 'Done.',
    answerClipped: false,
    answerAt: new Date(NOW - (10 - index) * 60_000 + 30_000).toISOString(),
    closed: true,
    interrupted: false,
    notice: null,
    git: 'nothing-to-check',
    namedOnlyOutside: false
  };
}

function session(
  name: string,
  agent: string,
  turnCount: number
): OverviewSessionView {
  return {
    sessionId: `id-${name}`,
    name,
    agent,
    agentLabel: agent,
    model: null,
    branch: null,
    line: agent === 'shell' ? 'shell' : 'turns',
    lineDetail: null,
    askOnly: false,
    noTurnClock: false,
    startedAt: NOW - 3_600_000,
    lastTouchedAt: NOW - 60_000,
    turns: Array.from({ length: turnCount }, (_, i) => turn(i))
  };
}

describe('the columns draw the whole conversation', () => {
  const a = session('claude-6', 'claude', 3);
  const b = session('codex-2', 'codex', 2);
  const markup = renderToStaticMarkup(
    <SessionColumns
      sessions={[a, b]}
      statuses={{ [a.sessionId]: 'idle', [b.sessionId]: 'idle' }}
      now={NOW}
    />
  );

  it('draws one turn block per turn, in both columns', () => {
    const turns = markup.match(/data-turn="/g) ?? [];
    expect(turns.length).toBe(5);
  });

  it('marks exactly one column focused, and it is the first', () => {
    const focused = markup.match(/overview-column focused/g) ?? [];
    expect(focused.length).toBe(1);
    const firstColumn = markup.indexOf('overview-column focused');
    const secondColumn = markup.indexOf('codex-2');
    expect(firstColumn).toBeGreaterThan(-1);
    expect(firstColumn).toBeLessThan(secondColumn);
  });
});

describe('the project rows carry the agent mark', () => {
  const rows = [
    session('claude-6', 'claude', 1),
    session('shell-2', 'shell', 0)
  ];
  const project: OverviewProject = {
    projectPath: '/tmp/p1372',
    projectName: 'p1372',
    readAt: NOW,
    isGitRepo: true,
    sessions: rows,
    reads: {}
  };
  const markup = renderToStaticMarkup(
    <ProjectLines
      project={project}
      statuses={{ 'id-claude-6': 'idle', 'id-shell-2': 'idle' }}
      selected={0}
      onSelect={() => {}}
      onActivate={() => {}}
      now={NOW}
    />
  );

  it('draws exactly one icon element, on the agent row alone', () => {
    const icons = markup.match(/gmux-icon/g) ?? [];
    expect(icons.length).toBe(1);
  });

  it('draws the icon before the agent row name and none near the shell name', () => {
    const icon = markup.indexOf('gmux-icon');
    const agentName = markup.indexOf('claude-6');
    const shellName = markup.indexOf('shell-2');
    expect(icon).toBeGreaterThan(-1);
    expect(icon).toBeLessThan(agentName);
    expect(shellName).toBeGreaterThan(agentName);
  });

  it('keeps the name wrapped in data-quoted beside the mark', () => {
    expect(markup).toContain('overview-line-name-text');
    expect(markup).toMatch(/data-quoted[^>]*>claude-6/);
  });
});

describe('the stylesheet, held to the phase', () => {
  const css = readFileSync(join(__dirname, '..', 'overview.css'), 'utf8');

  it('gives the column body its own scroller', () => {
    const body = css.split('.overview-column-body')[1] ?? '';
    expect(body).toContain('overflow-y: auto');
  });

  it('no longer draws the bottom fade on the column body', () => {
    expect(css).not.toContain('.overview-column-body::after');
  });

  it('colors the focus edge with a token', () => {
    const rule = css.split('.overview-column.focused')[1] ?? '';
    const block = rule.slice(0, rule.indexOf('}'));
    expect(block).toContain('var(--');
    expect(block).not.toMatch(/#[0-9a-fA-F]{3}/);
  });
});
