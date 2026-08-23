/**
 * claude through the product reader, against the committed fixture. The
 * fixture carries ten of the section 16 traps and the expected matrix row is
 * 3 turns, 3 answers.
 */

import { describe, expect, it } from 'vitest';
import { JSONL_CASES, keptText, readFixture } from './reader-helpers';

const BANNED = [
  'task-notification',
  'This session is being continued',
  'Another Claude session',
  'local-command-stdout',
  'session limit',
  'teammate-message',
  'bash-notification',
  'Request interrupted by user',
  '<bash-input>',
  'local-command-caveat',
  'packaging investigator'
];

describe('reader, claude', () => {
  const r = readFixture(JSONL_CASES['claude']!);

  it('fills the matrix row, 3 turns and 3 answers', () => {
    expect(r.turns.length).toBe(3);
    expect(r.turns.filter((t) => t.answer).length).toBe(3);
    expect(r.work).toBe('full');
    expect(r.acct.prefilter).toBe('head');
    expect(r.acct.turnMode).toBe('per-ask');
  });

  it('leaks no banned trap string into the kept slice', () => {
    const all = keptText(r);
    for (const b of BANNED) expect(all).not.toContain(b);
  });

  it('keeps a slash command with an argument as a whole ask', () => {
    expect(r.turns[1]!.ask.text).toBe('/loop keep going on the packaging gate until it is green');
  });

  it('drops a configuration command whole, /effort never becomes an ask', () => {
    expect(keptText(r)).not.toContain('ultracode');
  });

  it("stores the CLI's <synthetic> notice as the turn's notice, never as the answer", () => {
    const t = r.turns[2]!;
    expect(t.notice).toContain("You've hit your session limit");
    expect(t.answer!.text).not.toContain('session limit');
    expect(t.answer!.text).toContain('dmg-icon.icns');
  });

  it('marks the turn the interrupt marker landed in', () => {
    expect(r.turns[2]!.interrupted).toBe(true);
  });

  it('reads the model and the branch from the kept records', () => {
    expect(r.meta.model).toBe('claude-opus-5');
    expect(r.meta.branch).toBe('main');
  });

  it('reads the join from the records themselves', () => {
    expect(r.join.sessionId).toBe('11111111-2222-4333-8444-555555555555');
    expect(r.join.cwd).toBe('/Users/dev/demo-app');
  });

  it('carries each ask and answer clock', () => {
    expect(r.turns[0]!.ask.at).toBe('2026-08-20T09:00:03.100Z');
    expect(r.turns[0]!.answer!.at).toBe('2026-08-20T09:00:14.500Z');
    expect(r.lastTouchedAt).toBe('2026-08-20T10:05:00.000Z');
  });

  it('indexes the paths the tool calls named and throws the payload away', () => {
    const t = r.turns[0]!;
    expect(t.pathSource).toBe('tool-calls');
    const release = t.paths.find((p) => p.path === 'scripts/release.sh');
    expect(release).toBeDefined();
    expect(release!.inside).toBe(true);
    expect(release!.source).toBe('command');
  });
});
