/**
 * Unit cover for the parts of the resume-conformance harness that decide
 * whether a run is green — the nonce algebra, the pattern classification and
 * the exit code. These are exactly the places a subtle bug would make the
 * harness cheerfully pass while resume was broken, which is the failure this
 * whole phase exists to end.
 */

import { describe, expect, it } from 'vitest';
import {
  ARGV_REJECTED_PATTERNS,
  BYPASS_FLAGS,
  INTERACTIVE_GATE_PATTERNS,
  SELECTED_AFFIRMATIVE,
  TRUST_DIALOG_PATTERNS,
  assertBypassFlagsAreCataloged,
  firstMatch,
  plantPrompt,
  recallPrompt
} from '../cases';
import {
  containsJoined,
  containsToken,
  exitCodeFor,
  makeNonce,
  normalizeForToken,
  renderDetail,
  renderSummary,
  renderTable,
  type AgentConformanceResult
} from '../report';

const result = (
  over: Partial<AgentConformanceResult> & { agent: string }
): AgentConformanceResult => ({
  verdict: 'PASS',
  captureMode: 'pre-assign --session-id',
  ms: 1234,
  stages: [],
  ...over
});

describe('nonce normalization', () => {
  it('rejoins a token wrapped across TUI rows and gutters', () => {
    const pane = '│ ready-a1b2\n│ c3d4 done';
    expect(containsJoined(pane, 'ready', 'a1b2c3d4')).toBe(true);
  });

  it('sees through ANSI colour', () => {
    const pane = '\x1b[32mready\x1b[0m-\x1b[1mdeadbeef\x1b[0m';
    expect(containsJoined(pane, 'ready', 'deadbeef')).toBe(true);
  });

  it('is case-insensitive in both directions', () => {
    expect(containsJoined('READY - DeadBEEF', 'ready', 'deadbeef')).toBe(true);
  });

  it('requires ADJACENCY — the whole point of the verify nonce', () => {
    // Both nonces on screen, far apart: exactly what a REPLAYED SCROLLBACK
    // plus a fresh prompt looks like when resume did nothing.
    const pane = 'earlier you said 11112222\n\n> please echo 33334444 then it';
    expect(containsToken(pane, '11112222')).toBe(true);
    expect(containsToken(pane, '33334444')).toBe(true);
    expect(containsJoined(pane, '33334444', '11112222')).toBe(false);
  });

  it('normalizes to bare lowercase alphanumerics', () => {
    expect(normalizeForToken('A-b_C 1.2\n3')).toBe('abc123');
  });

  it('makeNonce is pronounceable, digit-free, and free of repeated runs', () => {
    for (let i = 0; i < 200; i++) {
      const n = makeNonce();
      expect(n).toMatch(/^(?:[bdfgkmnprstvz][aeiou]){4}$/);
      // No repeated character run — the failure that made codex echo
      // "aaeeffbff" for "aaeffbff" and fail a working resume.
      expect(n).not.toMatch(/(.)\1/);
    }
    expect(makeNonce(4, () => 0)).toBe('baba');
  });
});

describe('the prompts cannot fake their own answers', () => {
  // If the prompt text itself contained the answer, every agent would "pass"
  // the moment gmux typed the question — including a dead one.
  it('plant prompt never contains ready<nonce>', () => {
    const nonce = 'a1b2c3d4';
    expect(containsJoined(plantPrompt(nonce), 'ready', nonce)).toBe(false);
    expect(containsToken(plantPrompt(nonce), nonce)).toBe(true);
  });

  it('recall prompt never contains verify<plant>', () => {
    const plant = 'a1b2c3d4';
    const verify = '99887766';
    expect(containsJoined(recallPrompt(verify), verify, plant)).toBe(false);
  });

  it('a pane holding the prompt AND the replayed plant still fails', () => {
    const plant = 'a1b2c3d4';
    const verify = '99887766';
    const pane = `old transcript: ready-${plant}\n> ${recallPrompt(verify)}\n`;
    expect(containsJoined(pane, verify, plant)).toBe(false);
  });

  it('and passes only once the agent joins them', () => {
    const plant = 'a1b2c3d4';
    const verify = '99887766';
    const pane = `> ${recallPrompt(verify)}\n${verify}${plant}\n`;
    expect(containsJoined(pane, verify, plant)).toBe(true);
  });
});

describe('pane classification', () => {
  it('names the deepseek dead-pane line', () => {
    const pane = "error: unexpected argument '--resume <id>' found\n";
    expect(firstMatch(pane, ARGV_REJECTED_PATTERNS)).toBe(
      "error: unexpected argument '--resume <id>' found"
    );
  });

  it('recognises the cwd-scoped qwen failure', () => {
    expect(
      firstMatch('No saved session found with ID 8afd\n', ARGV_REJECTED_PATTERNS)
    ).toBe('No saved session found with ID 8afd');
  });

  it('recognises a human gate', () => {
    expect(firstMatch('Do you trust this folder?', INTERACTIVE_GATE_PATTERNS)).toBe(
      'Do you trust this folder?'
    );
    expect(firstMatch('Error: not logged in', INTERACTIVE_GATE_PATTERNS)).toBe(
      'Error: not logged in'
    );
  });

  it('does not classify an ordinary working pane', () => {
    const pane = 'ready-a1b2c3d4\n> \n';
    expect(firstMatch(pane, ARGV_REJECTED_PATTERNS)).toBeNull();
    expect(firstMatch(pane, INTERACTIVE_GATE_PATTERNS)).toBeNull();
  });

  it('answers only a dialog whose selected option is affirmative', () => {
    // The two shapes measured on this machine, 2026-08-11.
    const codex = '  Do you trust the contents of this directory?\n\n› 1. Yes, continue\n  2. No, quit\n';
    const cursor =
      '  │  Do you trust the contents of this directory?  │\n  │  ▶ [a] Trust this workspace  │\n  │    [q] Quit  │\n';
    expect(firstMatch(codex, TRUST_DIALOG_PATTERNS)).not.toBeNull();
    expect(SELECTED_AFFIRMATIVE.test(codex)).toBe(true);
    expect(firstMatch(cursor, TRUST_DIALOG_PATTERNS)).not.toBeNull();
    expect(SELECTED_AFFIRMATIVE.test(cursor)).toBe(true);
  });

  it('leaves a trust-ish screen with no readable default alone', () => {
    // deepseek's onboarding: says "trust", offers nothing the harness can
    // read as selected. Pressing Enter into it killed the pane on 2026-08-11.
    const onboarding =
      'Welcome to DeepSeek\n\nDo you trust this workspace? Configure with /settings\n\n  Press any key\n';
    expect(firstMatch(onboarding, TRUST_DIALOG_PATTERNS)).not.toBeNull();
    expect(SELECTED_AFFIRMATIVE.test(onboarding)).toBe(false);
  });

  it("does not read pi's benign creation notice as a rejection", () => {
    const pane =
      'No project session found with id 019ed309; creating a new session with that id.';
    expect(firstMatch(pane, ARGV_REJECTED_PATTERNS)).toBeNull();
  });
});

describe('bypass flags stay tied to the verified flag catalog', () => {
  it('every flag the harness passes is a VERIFIED preset', () => {
    const agents = Object.keys(BYPASS_FLAGS) as (keyof typeof BYPASS_FLAGS)[];
    expect(assertBypassFlagsAreCataloged(agents)).toEqual([]);
  });
});

describe('verdict arithmetic', () => {
  it('only FAIL is red by default', () => {
    const rows = [
      result({ agent: 'claude', verdict: 'PASS' }),
      result({ agent: 'droid', verdict: 'SKIP' }),
      result({ agent: 'gemini', verdict: 'BLOCKED' })
    ];
    expect(exitCodeFor(rows)).toBe(0);
    expect(exitCodeFor(rows, true)).toBe(1);
    expect(exitCodeFor([...rows, result({ agent: 'pi', verdict: 'FAIL' })])).toBe(1);
  });

  it('summarises every verdict', () => {
    expect(
      renderSummary([
        result({ agent: 'a', verdict: 'PASS' }),
        result({ agent: 'b', verdict: 'FAIL' })
      ])
    ).toBe('1 PASS · 1 FAIL · 0 BLOCKED · 0 SKIP');
  });
});

describe('rendering', () => {
  const rows = [
    result({
      agent: 'pi',
      capturedId: '019ed309-1111-2222-3333-444455556666',
      armedAtSpawn: true,
      capturedBeforeTurn: true,
      recall: 'proven',
      resumeArgv: ['/Users/x/.npm-global/bin/pi', '--session-id', '019ed309'],
      launchArgv: ['/Users/x/.npm-global/bin/pi', '--session-id', '019ed309']
    }),
    result({
      agent: 'droid',
      verdict: 'SKIP',
      reason: 'droid not installed on this machine',
      captureMode: 'unverified'
    })
  ];

  it('table has one row per agent and a header', () => {
    const lines = renderTable(rows).split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toContain('AGENT');
    expect(lines[0]).toContain('ROUNDTRIP');
    expect(lines[2]).toContain('pi');
    expect(lines[3]).toContain('SKIP');
  });

  it('detail prints the EXACT resume argv — the thing a human diffs', () => {
    const text = renderDetail(rows);
    expect(text).toContain('/Users/x/.npm-global/bin/pi --session-id 019ed309');
    expect(text).toContain('captured id  019ed309-1111-2222-3333-444455556666');
    expect(text).toContain('droid — SKIP: droid not installed on this machine');
  });
});
