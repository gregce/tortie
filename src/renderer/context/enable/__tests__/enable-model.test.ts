/**
 * The "Enable for…" picker rules (Phase 26 item 3), tested without a DOM.
 *
 * The rule that must never regress is the two-agent floor: `installCommand`
 * in main throws for a single agent, because with one target directory the
 * CLI writes a full copy instead of a symlink and later adds silently do
 * nothing. The picker states that refusal before the plan call can meet it,
 * and these tests pin the statement to the same boundary.
 */

import { describe, expect, it } from 'vitest';
import {
  addedTargets,
  buildEnableTargets,
  enableBlocker,
  NO_CLI_NAME_REASON,
  sendableTargets,
  toggleEnableTarget
} from '../enable-model';
import type { EnableAgentInput } from '../enable-model';

const fleet: EnableAgentInput[] = [
  { id: 'claude', name: 'Claude Code', cliName: 'claude-code' },
  { id: 'codex', name: 'Codex CLI', cliName: 'codex' },
  { id: 'gemini', name: 'Gemini CLI', cliName: 'gemini-cli' },
  { id: 'muse', name: 'Muse Code', cliName: null }
];

describe('buildEnableTargets', () => {
  it('pre-checks and locks exactly the agents that hold the skill on disk', () => {
    const targets = buildEnableTargets(fleet, ['claude']);
    const claude = targets.find((t) => t.agentId === 'claude');
    const codex = targets.find((t) => t.agentId === 'codex');
    expect(claude?.checked).toBe(true);
    expect(claude?.locked).toBe(true);
    expect(codex?.checked).toBe(false);
    expect(codex?.locked).toBe(false);
  });

  it('disables a CLI-unknown agent with the same sentence the install sheet shows', () => {
    const targets = buildEnableTargets(fleet, []);
    const muse = targets.find((t) => t.agentId === 'muse');
    expect(muse?.unavailableReason).toBe(NO_CLI_NAME_REASON);
  });

  it('keeps an on-disk agent the CLI cannot target as a checked fact', () => {
    // The disk says Muse Code has it; the command will simply not name it.
    const targets = buildEnableTargets(fleet, ['muse']);
    const muse = targets.find((t) => t.agentId === 'muse');
    expect(muse?.checked).toBe(true);
    expect(muse?.unavailableReason).toBe(NO_CLI_NAME_REASON);
    expect(sendableTargets(targets)).toHaveLength(0);
  });
});

describe('toggleEnableTarget', () => {
  it('toggles a free row', () => {
    const targets = buildEnableTargets(fleet, ['claude']);
    const next = toggleEnableTarget(targets, 'codex');
    expect(next.find((t) => t.agentId === 'codex')?.checked).toBe(true);
  });

  it('never unchecks a locked row and never checks an unavailable one', () => {
    const targets = buildEnableTargets(fleet, ['claude']);
    const afterLocked = toggleEnableTarget(targets, 'claude');
    expect(afterLocked.find((t) => t.agentId === 'claude')?.checked).toBe(true);
    const afterOff = toggleEnableTarget(targets, 'muse');
    expect(afterOff.find((t) => t.agentId === 'muse')?.checked).toBe(false);
  });
});

describe('enableBlocker', () => {
  it('blocks when nothing new is checked', () => {
    const targets = buildEnableTargets(fleet, ['claude', 'codex']);
    expect(enableBlocker(targets)).toMatch(/at least one agent/);
  });

  it('blocks a total of exactly one sendable agent, naming the CLI rule', () => {
    // Nothing on disk, one new agent checked: the command would name one
    // agent, which main refuses. The picker says why before main has to.
    const targets = toggleEnableTarget(
      buildEnableTargets(fleet, []),
      'codex'
    );
    expect(enableBlocker(targets)).toMatch(/exactly one agent/);
  });

  it('allows one added agent when one is already on disk (total two)', () => {
    const targets = toggleEnableTarget(
      buildEnableTargets(fleet, ['claude']),
      'codex'
    );
    expect(enableBlocker(targets)).toBeNull();
    expect(addedTargets(targets).map((t) => t.agentId)).toEqual(['codex']);
    expect(sendableTargets(targets).map((t) => t.agentId)).toEqual([
      'claude',
      'codex'
    ]);
  });

  it('does not count an unsendable on-disk agent toward the two-agent floor', () => {
    // Muse Code holds it on disk but the CLI cannot name it, so checking one
    // new agent still yields a one-agent command, which stays blocked.
    const targets = toggleEnableTarget(
      buildEnableTargets(fleet, ['muse']),
      'codex'
    );
    expect(enableBlocker(targets)).toMatch(/exactly one agent/);
  });
});
