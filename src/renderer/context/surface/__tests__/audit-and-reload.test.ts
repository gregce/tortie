/**
 * Two rules that a later round is likely to soften, pinned here.
 *
 *  - An absent scanner says "not scanned". It is never blank and it is never
 *    read as safe. 36.82 per cent of 3,984 scanned skills carried a flaw, so
 *    silence is not evidence.
 *  - `unknown` live-reload is a first-class answer with its own sentence.
 *    Guessing is worse than admitting, because the user's next action depends
 *    on the answer.
 */

import { describe, expect, it } from 'vitest';
import {
  auditSentence,
  formatScanDate,
  isElevatedRisk,
  missingScanners,
  worstRisk
} from '../audit';
import {
  blastRadiusSentence,
  driftSentence,
  reloadLineAgents,
  reloadLines,
  type ReloadLine
} from '../reload-sentence';
import type { AgentReload, AuditRecord } from '../model';
import type { ContextReloadBehavior } from '../../model';

function agent(
  id: string,
  name: string,
  behavior: ContextReloadBehavior,
  note: string
): AgentReload {
  return {
    agentId: id,
    agentName: name,
    cell: { behavior, note, reloadCommand: null, evidence: 'verified' }
  };
}

const NOW = Date.parse('2026-08-12T00:00:00Z');

describe('the audit row', () => {
  const record: AuditRecord = {
    ath: { risk: 'safe', analyzedAt: '2026-04-16T00:00:00Z' },
    socket: {
      risk: 'safe',
      alerts: 0,
      score: 90,
      analyzedAt: '2026-04-16T00:00:00Z'
    },
    snyk: { risk: 'low', analyzedAt: '2026-04-16T00:00:00Z' },
    zeroleaks: { risk: 'safe', score: 93, analyzedAt: '2026-04-16T00:00:00Z' }
  };

  it('reads as one sentence with the scan date on it', () => {
    expect(auditSentence(record, NOW)).toBe(
      'Scanned 16 April: Socket 0 alerts, Snyk low, ZeroLeaks 93, Gen safe.'
    );
  });

  it('says not scanned when nothing has looked', () => {
    expect(auditSentence(null, NOW)).toBe('Not scanned.');
    expect(auditSentence({}, NOW)).toBe('Not scanned.');
    expect(worstRisk(null)).toBeNull();
  });

  it('names the scanners that had nothing to say', () => {
    expect(missingScanners({ socket: { risk: 'safe' } })).toEqual([
      'Snyk',
      'ZeroLeaks',
      'Gen'
    ]);
  });

  it('reports the worst risk any scanner found, not the first', () => {
    expect(
      worstRisk({ socket: { risk: 'safe' }, snyk: { risk: 'critical' } })
    ).toBe('critical');
    expect(isElevatedRisk('critical')).toBe(true);
    expect(isElevatedRisk('high')).toBe(true);
    expect(isElevatedRisk('medium')).toBe(false);
    expect(isElevatedRisk(null)).toBe(false);
  });

  it('adds the year once it carries information', () => {
    expect(formatScanDate(Date.parse('2026-04-16T12:00:00Z'), NOW)).toBe(
      '16 April'
    );
    expect(formatScanDate(Date.parse('2024-04-16T12:00:00Z'), NOW)).toBe(
      '16 April 2024'
    );
  });
});

describe('live reload, which is registry data', () => {
  const agents: AgentReload[] = [
    agent(
      'claude',
      'Claude Code',
      'live',
      'Claude Code picks this up while it is running.'
    ),
    agent(
      'codex',
      'Codex',
      'unknown',
      'Tortie does not know whether Codex picks this up while it is running.'
    ),
    agent(
      'gemini',
      'Gemini',
      'next-session',
      'Gemini reads this when a session starts.'
    )
  ];

  it('prints the sentence the registry supplied rather than composing one', () => {
    const out = reloadLines(agents).map((l) => l.note);
    expect(out).toContain(
      'Tortie does not know whether Codex picks this up while it is running.'
    );
  });

  it('orders live first, then next session, then unknown', () => {
    expect(reloadLines(agents).map((l) => l.behavior)).toEqual([
      'live',
      'next-session',
      'unknown'
    ]);
  });

  it('uses the short blast radius only when every agent reads at startup', () => {
    const allNext: AgentReload[] = [
      agent('claude', 'Claude Code', 'next-session', 'x'),
      agent('codex', 'Codex', 'next-session', 'y')
    ];
    expect(blastRadiusSentence(allNext)).toBe(
      'Sessions running now are not affected.'
    );
    expect(blastRadiusSentence(agents)).not.toBe(
      'Sessions running now are not affected.'
    );
  });

  it('names the unknown agent in the blast radius rather than averaging it away', () => {
    expect(blastRadiusSentence(agents)).toContain(
      'Tortie does not know whether Codex'
    );
  });

  it('admits it does not know when the registry told it nothing', () => {
    expect(blastRadiusSentence([])).toBe(
      'Tortie does not know whether sessions running now will pick this up.'
    );
  });

  it('says nothing at all when a row is unchanged', () => {
    expect(driftSentence('unchanged')).toBeNull();
  });

  it('keeps the removed case, which is the one nobody expects', () => {
    expect(driftSentence('removed')).toBe(
      'Removed since this session started. This session is still running it.'
    );
  });
});

describe('reloadLines groups agents that give the same answer', () => {
  // Added at integration, after the card was mounted against a real machine.
  // A skill loaded by six agents where five share the `unknown` cell drew the
  // same unnamed sentence five times, and a reader could not tell five agents
  // from one bug.
  const shared = 'Tortie does not know whether a session already running picks this up.';

  it('draws one line for five agents that share a note, and names all five', () => {
    const many: AgentReload[] = [
      agent('codex', 'Codex', 'unknown', shared),
      agent('cursor', 'Cursor', 'unknown', shared),
      agent('gemini', 'Gemini', 'unknown', shared),
      agent('muse', 'Muse', 'unknown', shared),
      agent('pi', 'Pi', 'unknown', shared)
    ];
    const lines = reloadLines(many);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.agentNames).toEqual([
      'Codex',
      'Cursor',
      'Gemini',
      'Muse',
      'Pi'
    ]);
    expect(reloadLineAgents(lines[0] as ReloadLine)).toBe(
      'Codex, Cursor, Gemini, Muse and Pi'
    );
    // The note is still the registry's, character for character.
    expect(lines[0]?.note).toBe(shared);
  });

  it('keeps two agents apart when they share a behaviour but not a reason', () => {
    const lines = reloadLines([
      agent('claude', 'Claude Code', 'next-session', 'Claude reads it at startup.'),
      agent('codex', 'Codex', 'next-session', 'Codex reads it at startup.')
    ]);
    expect(lines).toHaveLength(2);
  });

  it('still orders live, then next session, then unknown', () => {
    const lines = reloadLines([
      agent('a', 'A', 'unknown', shared),
      agent('b', 'B', 'live', 'B picks it up.'),
      agent('c', 'C', 'next-session', 'C reads it at startup.')
    ]);
    expect(lines.map((l) => l.behavior)).toEqual([
      'live',
      'next-session',
      'unknown'
    ]);
  });
});
