/**
 * Phase 331's fix round, the conformance harness (build/p331/SPEC.md,
 * "§As built — the fix round"). Four defects the verifiers measured in the
 * harness the phase's screen reading runs inside, each held here so it cannot
 * come back quietly:
 *
 *  - Claude Code 2.1.285's folder question highlights "No, exit", so the
 *    harness pressed nothing, its plant prompt's Enter chose the refusal and
 *    Claude ended with status 1, and in capture mode the screen was read AT the
 *    question, which Claude draws on the normal screen at every build, so the
 *    inline gate could not fail for Claude.
 *  - The detection scan the core starts at boot version-probed every installed
 *    agent whatever GMUX_CONF_AGENTS said.
 *  - Codex's update check ran on the create, and the resumed Codex's update
 *    prompt was accepted by the harness's own keystrokes.
 *  - Nothing said so when an install moved during the run.
 *
 * The screens below are the SHAPE the verifier captured on 2026-09-29, with the
 * folder path invented. No tmux server is started and no agent runs: the one
 * tmux module this file reaches is answered here.
 *
 * `ablation:p331` breaks each clause in a clone and requires these rows red.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { LaunchableAgentId } from '@shared/types';
import { AGENT_REGISTRY, registryResumeArgv } from '../../agents/registry';

const { execTmux, capturePane } = vi.hoisted(() => ({
  execTmux: vi.fn<(args: readonly string[]) => Promise<string>>(),
  capturePane: vi.fn<(target: string, lines?: number) => Promise<string>>()
}));
vi.mock('../../tmux', () => ({ execTmux, capturePane }));

import {
  HARNESS_ONLY_ARGS,
  assertBypassFlagsAreCataloged,
  conformanceDetectionTable,
  harnessExtras,
  trustGateStep
} from '../cases';
import { answerTrustGate } from '../pane';
import { movedInstalls } from '../report';
import { judgeScreen, unreadBecause } from '../screen-class';

/** Claude Code 2.1.285's folder question, as drawn: the highlight on the refusal. */
const CLAUDE_TRUST = [
  '─'.repeat(80),
  ' Accessing workspace:',
  '',
  ' /private/tmp/p331-fixture/projects/untrusted',
  '',
  ' Quick safety check: Is this a project you created or one you trust? (Like your',
  ' own code, a well-known open source project, or work from your team). If not,',
  " take a moment to review what's in this folder first.",
  '',
  " Claude Code'll be able to read, edit, and execute files here.",
  '',
  ' Security guide',
  '',
  ' ❯ No, exit',
  '   Yes, I trust this folder',
  '',
  ' Enter to confirm · Esc to cancel',
  // tmux captures the whole 40-row screen: the question sits at the TOP of
  // it, with blank rows under it, which is what hid the highlight from a
  // bottom-24 window on the real Claude.
  ...Array.from({ length: 24 }, () => '')
].join('\n');
/** The same question after one Down. */
const CLAUDE_TRUST_DOWN = CLAUDE_TRUST.replace(' ❯ No, exit\n   Yes,', '   No, exit\n ❯ Yes,');
/** Claude's main screen once the question is answered. */
const CLAUDE_MAIN = [' ▐▛███▛█   Claude Code v2.1.285', '─'.repeat(80), '❯ ', '─'.repeat(80), '  ? for shortcuts', ''].join('\n');
/** Codex 0.158's folder question: the highlight already on the accept. */
const CODEX_TRUST = [
  '  Trust this folder? Codex can read, edit, and run files here.',
  '› 1. Trust and continue',
  '  2. Quit',
  '  enter continue · esc quit',
  ''
].join('\n');

const sent = (): string[] =>
  execTmux.mock.calls.map((call) => call[0]).filter((a) => a[0] === 'send-keys').map((a) => String(a[a.length - 1]));

beforeEach(() => {
  execTmux.mockReset();
  capturePane.mockReset();
  execTmux.mockResolvedValue('');
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Run a promise that waits on timers to its end. */
async function drive<T>(p: Promise<T>): Promise<T> {
  let done = false;
  let value: T | undefined;
  let failure: unknown = null;
  p.then(
    (v) => {
      done = true;
      value = v;
    },
    (e: unknown) => {
      done = true;
      failure = e ?? new Error('rejected');
    }
  );
  for (let i = 0; i < 200 && !done; i += 1) await vi.advanceTimersByTimeAsync(500);
  if (failure !== null) throw failure;
  if (!done) throw new Error('the harness never finished');
  return value as T;
}

/**
 * A pane that answers `capture-pane` from a script: the question until a Down,
 * then `afterDown`, then after an Enter `afterEnter`.
 */
function scriptedPane(first: string, afterDown: string, afterEnter: string): void {
  let screen = first;
  execTmux.mockImplementation(async (args) => {
    if (args[0] === 'send-keys') {
      const key = String(args[args.length - 1]);
      if (key === 'Down') screen = afterDown;
      if (key === 'Enter') screen = afterEnter;
    }
    return '';
  });
  capturePane.mockImplementation(async () => screen);
}

describe("Phase 331's fix round: the conformance harness", () => {
  it("Claude Code's folder question with its focus on No is answered by one Down and then Enter, and only when the accept is then highlighted", async () => {
    // The decision, over each shape the harness meets.
    expect(trustGateStep(CLAUDE_TRUST)).toBe('down-then-enter');
    expect(trustGateStep(CLAUDE_TRUST_DOWN)).toBe('enter');
    expect(trustGateStep(CODEX_TRUST)).toBe('enter');
    expect(trustGateStep('Do you trust the files in this folder?\n ▶ [a] Trust this workspace\n   [q] Quit')).toBe('enter');
    // deepseek's onboarding says "trust" and highlights nothing: nothing is pressed.
    expect(trustGateStep('Welcome. You can trust this folder later in settings.\n  Continue with the tour')).toBe('none');
    // The refusal highlighted with no accept directly under it: nothing is pressed.
    const noAccept = CLAUDE_TRUST.replace(' Accessing workspace:', ' Do you trust this folder?').replace('   Yes, I trust this folder', '   Read the security guide');
    expect(trustGateStep(noAccept)).toBe('none');
    // The accept under the refusal must be the NEXT option, not a second highlight.
    expect(trustGateStep(CLAUDE_TRUST.replace('   Yes, I trust', ' ❯ Maybe, I trust'))).not.toBe('down-then-enter');
    expect(trustGateStep(CLAUDE_MAIN)).toBe('absent');

    // Driven: one Down, then Enter once the accept is highlighted.
    scriptedPane(CLAUDE_TRUST, CLAUDE_TRUST_DOWN, CLAUDE_MAIN);
    const answered = await drive(answerTrustGate('$1'));
    expect(sent()).toEqual(['Down', 'Enter']);
    expect(answered.answered).toBe(true);
    expect(answered.seen).toMatch(/trust this folder/i);

    // A Down that did not land on the accept presses nothing more.
    execTmux.mockReset();
    scriptedPane(CLAUDE_TRUST, CLAUDE_TRUST, CLAUDE_MAIN);
    const stuck = await drive(answerTrustGate('$1'));
    expect(sent()).toEqual(['Down']);
    expect(stuck).toEqual({ seen: expect.stringMatching(/trust this folder/i), answered: false });

    // Codex's shape is answered as it always was: Enter alone.
    execTmux.mockReset();
    scriptedPane(CODEX_TRUST, CODEX_TRUST, '› Ask Codex to do anything\n');
    const codex = await drive(answerTrustGate('$2'));
    expect(sent()).toEqual(['Enter']);
    expect(codex.answered).toBe(true);

    // An INLINE Codex keeps the answered question in its scrollback, above
    // its composer: the second look reads the bottom only, and presses nothing.
    execTmux.mockReset();
    const inlineAfter = `${CODEX_TRUST}${'\n'.repeat(3)}${Array.from({ length: 30 }, (_v, i) => `  line ${String(i)}`).join('\n')}\n› Ask Codex to do anything\n`;
    scriptedPane(CODEX_TRUST, CODEX_TRUST, inlineAfter);
    await drive(answerTrustGate('$2'));
    expect(sent()).toEqual(['Enter']);

    // No question: nothing pressed, nothing seen.
    execTmux.mockReset();
    scriptedPane(CLAUDE_MAIN, CLAUDE_MAIN, CLAUDE_MAIN);
    expect(await drive(answerTrustGate('$3'))).toEqual({ seen: null, answered: false });
    expect(sent()).toEqual([]);
  });

  it('a create reading taken at a trust question the harness could not answer is no reading, and fails a switch', () => {
    expect(unreadBecause({ seen: null, answered: false })).toBeNull();
    expect(unreadBecause({ seen: 'Yes, I trust this folder', answered: true })).toBeNull();
    const unread = unreadBecause({ seen: 'Yes, I trust this folder', answered: false });
    expect(unread).toContain('Yes, I trust this folder');

    // WHY: the verifier's reading of the PARENT's Claude at its question is
    // 0/0, which a switch row would pass. So it must not be taken there.
    expect(judgeScreen('claude', { alternateOn: false, mouseAny: false, historySize: 0 }).fail).toBeNull();

    for (const agent of ['claude', 'codex'] as const) {
      const judged = judgeScreen(agent, null, unread);
      expect(judged.fail).toContain('its screen was not read');
      expect(judged.fail).toContain('Yes, I trust this folder');
      expect(judged.fail).toMatch(/could not look has not passed/);
    }
    // Every other class records it and never fails.
    const cursor = judgeScreen('cursor', null, unread);
    expect(cursor.fail).toBeNull();
    expect(cursor.mismatch).toContain('Yes, I trust this folder');

    // resume.ts answers the question BEFORE the reading, for a switch row, and
    // reads nothing when a question was left: read as text, in order.
    const source = readFileSync(join(__dirname, '..', 'resume.ts'), 'utf8');
    const answer = source.indexOf('const gate = switched ? await answerTrustGate(tmuxId)');
    const refuse = source.indexOf('const createReading = unread === null ? await readScreen(tmuxId) : null;');
    const judge = source.indexOf('const createJudged = judgeScreen(agent, createReading, unread);');
    expect(answer).toBeGreaterThan(0);
    expect(refuse).toBeGreaterThan(answer);
    expect(judge).toBeGreaterThan(refuse);
  });

  it('the detection scan a conformance run starts covers only the agents it was asked for', () => {
    const eight: LaunchableAgentId[] = ['claude', 'cursor', 'codex', 'deepseek', 'muse', 'pi', 'omp', 'opencode'];
    const table = conformanceDetectionTable(eight).map((e) => e.id);
    expect([...table].sort()).toEqual([...eight].sort());
    for (const never of ['gemini', 'qwen', 'antigravity', 'grok', 'droid', 'cursor-ide', 'vscode']) {
      expect(table).not.toContain(never);
    }
    // Compiled rows only, and the very objects the registry holds.
    for (const entry of conformanceDetectionTable(eight)) {
      expect(AGENT_REGISTRY).toContain(entry);
    }
    expect(conformanceDetectionTable([])).toEqual([]);

    // The table is set BEFORE the core boots, because the boot's warm is the
    // first scan: read as text, in order, in the run's entry point.
    const source = readFileSync(join(__dirname, '..', 'resume.ts'), 'utf8');
    const entry = source.indexOf('export async function runResumeConformance');
    const set = source.indexOf('setAgentTableSource(() => conformanceDetectionTable(cfg.agents));', entry);
    const boot = source.indexOf('const core = await getGmuxCore();', entry);
    expect(entry).toBeGreaterThan(0);
    expect(set).toBeGreaterThan(entry);
    expect(boot).toBeGreaterThan(set);
    expect(source.split('setAgentTableSource(').length - 1).toBe(1);
  });

  it('Codex is created with its update check off, with and without the bypass flags, and the harvest carries it to the resume argv', () => {
    const off = ['-c', 'check_for_update_on_startup=false'];
    expect(harnessExtras('codex', true)).toEqual(['--dangerously-bypass-approvals-and-sandbox', ...off]);
    expect(harnessExtras('codex', false)).toEqual(off);
    // No other agent gains anything.
    expect(Object.keys(HARNESS_ONLY_ARGS)).toEqual(['codex']);
    expect(harnessExtras('claude', true)).toEqual(['--dangerously-skip-permissions']);
    expect(harnessExtras('claude', false)).toEqual([]);
    expect(harnessExtras('pi', true)).toEqual([]);
    // The bypass catalog check is untouched by it.
    expect(assertBypassFlagsAreCataloged(['codex'])).toEqual([]);
    // The harvest re-appends the create's extras, so the resumed Codex runs
    // with its update check off too, after the scrollback pair.
    const resumed = registryResumeArgv('codex', 'P331-ID', harnessExtras('codex', true), '/abs/codex');
    expect(resumed).toEqual([
      '/abs/codex',
      'resume',
      'P331-ID',
      '-c',
      'tui.fullscreen_transcript=false',
      '--dangerously-bypass-approvals-and-sandbox',
      ...off
    ]);
    // resume.ts creates with these extras and no other spelling.
    const source = readFileSync(join(__dirname, '..', 'resume.ts'), 'utf8');
    expect(source).toContain('const extraArgs = harnessExtras(agent, cfg.bypass);');
    expect(source).not.toContain('BYPASS_FLAGS[agent]');
  });

  it('an agent install that moved during the run is named, and one that stayed is not', () => {
    const stamp = (real: string, mtimeMs: number, size = 10) => ({ real, mtimeMs, size });
    const before = {
      codex: stamp('/g/codex.js', 1),
      claude: stamp('/v/claude', 5),
      pi: stamp('/n/pi.js', 7),
      muse: null,
      omp: stamp('/o/omp', 9)
    };
    const after = {
      codex: stamp('/g/codex.js', 2),
      claude: stamp('/v/claude', 5),
      pi: stamp('/n/pi2.js', 7),
      muse: stamp('/m/muse', 3),
      omp: null
    };
    const moved = movedInstalls(before, after);
    expect(moved).toHaveLength(3);
    expect(moved.some((l) => l.startsWith('codex ') && l.includes('rewritten'))).toBe(true);
    expect(moved.some((l) => l.startsWith('pi ') && l.includes('/n/pi2.js'))).toBe(true);
    expect(moved.some((l) => l.startsWith('omp ') && l.includes('no longer resolves'))).toBe(true);
    expect(moved.some((l) => l.startsWith('claude '))).toBe(false);
    // A size change alone is a move.
    expect(movedInstalls({ codex: stamp('/g/codex.js', 1, 10) }, { codex: stamp('/g/codex.js', 1, 11) })).toHaveLength(1);
    expect(movedInstalls(before, before)).toEqual([]);
  });
});
