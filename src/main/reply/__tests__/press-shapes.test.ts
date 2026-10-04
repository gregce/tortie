/**
 * The compiled press shapes (Phase 318, build/p318/SPEC.md §5.4.3, D11, D12;
 * §Revision R4, R20, R21, R22, R25, R27), over the REAL screens Claude Code
 * 2.1.287 and Codex 0.160.0 drew (build/fixtures/reply/), the committed
 * negatives, and screens built from the real ones. Every hidden character is
 * built from its code point at run time.
 */

import { describe, expect, it } from 'vitest';
import { QUESTION_MAX, questionFromHookBody } from '../../activity/question';
import { detectDialogRows, normalizeCapture } from '../../activity/screen';
import { hookBashOf } from '../hook-says';
import { pressableOf, readPress, type PressReading } from '../press-shapes';
import {
  activityFixture,
  CLAUDE_BASH_SCREENS,
  hookBodies,
  plainFixture,
  questionWindow,
  realCaptures
} from './fixtures';

/** The reading of one screen, with the hook a body would give (or none). */
function readScreen(agent: string, capture: string, body: string | null = null): PressReading | null {
  const screen = normalizeCapture(capture);
  const rows = detectDialogRows(screen);
  const hookAsk = body === null ? null : questionFromHookBody(body);
  const hookBash = body === null || hookAsk === null ? null : hookBashOf(body, hookAsk);
  return readPress({ agent, screen, rows, hookAsk, hookBash });
}

const bashBody = (command: string): string =>
  JSON.stringify({ hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command } });

/** The real Codex approval with no Reason row, its `$` row's command replaced. */
function codexWith(command: string): string {
  const real = plainFixture('codex-approval-no-reason-0.160.0.txt');
  expect(real).toContain('  $ touch p318-plain.txt\n');
  return real.replace('  $ touch p318-plain.txt\n', `  $ ${command}\n`);
}

describe('every real capture', () => {
  const bodies = hookBodies();
  const bodyFor = (file: string): string | null => {
    const i = CLAUDE_BASH_SCREENS.indexOf(file as (typeof CLAUDE_BASH_SCREENS)[number]);
    return i === -1 ? null : (bodies[i] ?? null);
  };
  const EXPECTED: Record<string, Omit<PressReading, 'shape'> & { shape: PressReading['shape'] } | null> = {
    'claude-bash-2.1.287.txt': {
      shape: 'claude-permission',
      markers: ['1', '2', '3', '4'],
      deny: ['4'],
      runs: 'Bash touch p318-one.txt',
      command: null
    },
    'claude-bash-multiline-2.1.287.txt': { shape: 'claude-permission', markers: ['1', '2', '3', '4'], deny: ['4'], runs: null, command: null },
    'claude-bash-long-2.1.287.txt': { shape: 'claude-permission', markers: ['1', '2', '3', '4'], deny: ['4'], runs: null, command: null },
    'claude-bash-blank-line-2.1.287.txt': { shape: 'claude-permission', markers: ['1', '2', '3', '4'], deny: ['4'], runs: null, command: null },
    'codex-approval-0.160.0.txt': {
      shape: 'codex-command-approval',
      markers: ['1', '2', '3'],
      deny: ['3'],
      runs: 'touch p318-one.txt',
      command: 'touch p318-one.txt'
    },
    'codex-approval-no-reason-0.160.0.txt': {
      shape: 'codex-command-approval',
      markers: ['1', '2', '3'],
      deny: ['3'],
      runs: 'touch p318-plain.txt',
      command: 'touch p318-plain.txt'
    },
    'codex-approval-reason-newline-0.160.0.txt': {
      shape: 'codex-command-approval',
      markers: ['1', '2', '3'],
      deny: ['3'],
      runs: 'touch p318-reason.txt',
      command: 'touch p318-reason.txt'
    },
    'codex-approval-multiline-0.160.0.txt': { shape: 'codex-command-approval', markers: ['1', '2', '3'], deny: ['3'], runs: null, command: null },
    'codex-approval-long-0.160.0.txt': { shape: 'codex-command-approval', markers: ['1', '2', '3'], deny: ['3'], runs: null, command: null },
    'codex-approval-blank-line-0.160.0.txt': { shape: 'codex-command-approval', markers: ['1', '2', '3'], deny: ['3'], runs: null, command: null },
    'codex-approval-tall-0.160.0.txt': { shape: 'codex-command-approval', markers: ['1', '2'], deny: ['2'], runs: null, command: null },
    'codex-approval-hidden-line-0.160.0.txt': { shape: 'codex-command-approval', markers: ['1', '2'], deny: ['2'], runs: null, command: null },
    'codex-approval-hidden-line-reason-0.160.0.txt': { shape: 'codex-command-approval', markers: ['1', '2'], deny: ['2'], runs: null, command: null },
    'codex-approval-spoofed-question-0.160.0.txt': null
  };

  it('reads exactly what the SPEC says of each one', () => {
    const presses = realCaptures().filter((c) => c.kind === 'press');
    expect(presses.map((c) => c.files[0]).sort()).toEqual(Object.keys(EXPECTED).sort());
    for (const capture of presses) {
      const file = capture.files[0] ?? '';
      const agent = capture.agent === 'Claude Code' ? 'claude' : 'codex';
      expect(readScreen(agent, plainFixture(file), bodyFor(file)), file).toEqual(EXPECTED[file]);
    }
  });

  it('never says a command other than the one the agent was really asked to run (R20)', () => {
    for (const capture of realCaptures().filter((c) => c.kind === 'press')) {
      const file = capture.files[0] ?? '';
      const agent = capture.agent === 'Claude Code' ? 'claude' : 'codex';
      const reading = readScreen(agent, plainFixture(file), bodyFor(file));
      if (reading === null || reading.runs === null) continue;
      const truth = capture.truth.command ?? '';
      expect(reading.runs, file).toBe(agent === 'claude' ? `Bash ${truth}` : truth);
    }
  });

  it('keeps the Codex shape where the shipping detector reads no question (R21)', () => {
    for (const file of [
      'codex-approval-long-0.160.0.txt',
      'codex-approval-tall-0.160.0.txt',
      'codex-approval-hidden-line-reason-0.160.0.txt'
    ]) {
      expect(detectDialogRows(normalizeCapture(plainFixture(file))).question, file).toBeNull();
      const reading = readScreen('codex', plainFixture(file));
      expect(reading?.shape, file).toBe('codex-command-approval');
      expect(reading === null ? null : pressableOf(reading), file).toEqual(reading?.deny);
    }
  });

  it('the three hostile approvals the first rule misread: two keep No, the spoofed one reads no shape (R20)', () => {
    expect(readScreen('codex', plainFixture('codex-approval-blank-line-0.160.0.txt'))?.runs).toBeNull();
    expect(readScreen('codex', plainFixture('codex-approval-hidden-line-0.160.0.txt'))?.runs).toBeNull();
    expect(readScreen('codex', plainFixture('codex-approval-spoofed-question-0.160.0.txt'))).toBeNull();
  });

  it('a shape is the agent\'s own: a Codex screen is no Claude shape, and a Claude screen no Codex one', () => {
    expect(readScreen('claude', plainFixture('codex-approval-0.160.0.txt'), bashBody('touch p318-one.txt'))).toBeNull();
    expect(readScreen('codex', plainFixture('claude-bash-2.1.287.txt'))).toBeNull();
    expect(readScreen('shell', plainFixture('claude-bash-2.1.287.txt'), bodies[0] ?? null)).toBeNull();
  });
});

describe('his ruling 2 ("Yes, allow them") and D12', () => {
  it('every option is pressable when what will run is said: Claude 2 and 3, Codex 2', () => {
    const claude = readScreen('claude', plainFixture('claude-bash-2.1.287.txt'), hookBodies()[0] ?? null);
    expect(claude === null ? [] : pressableOf(claude)).toEqual(['1', '2', '3', '4']);
    const codex = readScreen('codex', plainFixture('codex-approval-0.160.0.txt'));
    expect(codex === null ? [] : pressableOf(codex)).toEqual(['1', '2', '3']);
  });

  it('only No is pressable when it is not said', () => {
    const claude = readScreen('claude', plainFixture('claude-bash-multiline-2.1.287.txt'), hookBodies()[1] ?? null);
    expect(claude === null ? [] : pressableOf(claude)).toEqual(['4']);
  });

  it('a hook ask that is a tool name alone, one holding [REDACTED:, or one the 200 cut reached: only No', () => {
    const screen = plainFixture('claude-bash-2.1.287.txt');
    const alone = readScreen('claude', screen, bashBody('   '));
    expect(alone === null ? null : pressableOf(alone)).toEqual(['4']);
    const secret = readScreen('claude', screen, bashBody('curl -H "x-api-key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCD" x'));
    expect(questionFromHookBody(bashBody('curl -H "x-api-key: sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCD" x'))).toContain('[REDACTED:');
    expect(secret === null ? null : pressableOf(secret)).toEqual(['4']);
    const cut = readScreen('claude', screen, bashBody(`echo ${'b'.repeat(QUESTION_MAX)}`));
    expect(cut === null ? null : pressableOf(cut)).toEqual(['4']);
  });

  it('a 199-character question that IS the command, byte for byte, is said: equality is the whole test (R4)', () => {
    const command = `echo ${'c'.repeat(QUESTION_MAX - 1 - 'Bash echo '.length)}`;
    expect(`Bash ${command}`).toHaveLength(QUESTION_MAX - 1);
    const reading = readScreen('claude', plainFixture('claude-bash-2.1.287.txt'), bashBody(command));
    expect(reading?.runs).toBe(`Bash ${command}`);
  });
});

describe('Codex\'s $ line', () => {
  it('says a one-line command under the cap, and nothing longer', () => {
    const at = (n: number): string => `echo ${'d'.repeat(n - 'echo '.length)}`;
    expect(readScreen('codex', codexWith(at(QUESTION_MAX - 2)))?.runs).toBe(at(QUESTION_MAX - 2));
    expect(readScreen('codex', codexWith(at(QUESTION_MAX - 1)))?.runs).toBeNull();
  });

  it('a command drawn cut, redacted, or holding a hidden character is not said (R27)', () => {
    expect(readScreen('codex', codexWith(`ls ${String.fromCodePoint(0x2026)}`))?.runs).toBeNull();
    expect(readScreen('codex', codexWith('export K=sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCD'))?.runs).toBeNull();
    for (const cp of [0x061c, 0x200b, 0x200f, 0x202a, 0x202e, 0x2060, 0x2066, 0x206f, 0xfeff, 0x85]) {
      const reading = readScreen('codex', codexWith(`ls${String.fromCodePoint(cp)}-la`));
      expect(reading?.shape, cp.toString(16)).toBe('codex-command-approval');
      expect(reading?.runs, cp.toString(16)).toBeNull();
    }
  });

  it('a `$` row with no space, or a second `$` row, says nothing; a wrapped command says nothing', () => {
    expect(readScreen('codex', codexWith(''))?.runs).toBeNull();
    const two = codexWith('ls').replace('  $ ls\n', '  $ ls\n  $ rm -rf x\n');
    expect(readScreen('codex', two)?.runs).toBeNull();
    const wrapped = codexWith('ls').replace('  $ ls\n', '  $ ls\n  -la\n');
    expect(readScreen('codex', wrapped)?.runs).toBeNull();
    const glued = codexWith('ls').replace('  $ ls\n', '  $ls\n');
    expect(readScreen('codex', glued)?.runs).toBeNull();
  });

  it('a command that draws an option row of its own is read up to the REAL options, the lowest', () => {
    // The command `ls` LF `1. Yes, proceed (y)`: its second line sits between the
    // `$` row and the real options, where it must count as a line of the command.
    const fake = codexWith('ls').replace('  $ ls\n', '  $ ls\n  1. Yes, proceed (y)\n');
    const reading = readScreen('codex', fake);
    expect(reading?.shape).toBe('codex-command-approval');
    expect(reading?.runs).toBeNull();
  });

  it('needs Codex\'s own first and last option, and the question above the options', () => {
    const real = plainFixture('codex-approval-no-reason-0.160.0.txt');
    expect(readScreen('codex', real.replace('1. Yes, proceed (y)', '1. Yes, go ahead (y)'))).toBeNull();
    expect(readScreen('codex', real.replace('3. No, and tell Codex', '3. Nope, and tell Codex'))).toBeNull();
    expect(readScreen('codex', real.replace('  Would you like to run the following command?\n', '  Would you like to run this?\n'))).toBeNull();
    const below = real.replace('  Would you like to run the following command?\n', '\n') +
      '\n  Would you like to run the following command?\n';
    expect(readScreen('codex', below)).toBeNull();
  });
});

describe('what is no press shape', () => {
  const NEGATIVES: Array<[string, string]> = [
    ['claude-trust-2-1-280.txt', activityFixture('claude-trust-2-1-280.txt')],
    ['claude-theme-picker.txt', activityFixture('claude-theme-picker.txt')],
    ['claude-workspace-trust.txt', activityFixture('claude-workspace-trust.txt')],
    ['codex-signin-choice.txt', activityFixture('codex-signin-choice.txt')],
    ['a-codex-0002 (the update prompt)', questionWindow('a-codex.jsonl', 'a-codex-0002')],
    ['claude-security-notes-reconstructed.txt', plainFixture('claude-security-notes-reconstructed.txt')],
    ['non-agent-proceed-reconstructed.txt', plainFixture('non-agent-proceed-reconstructed.txt')],
    ['claude-edit.txt', plainFixture('claude-edit.txt')],
    ['claude-bash-resized-reconstructed.txt', plainFixture('claude-bash-resized-reconstructed.txt')]
  ];

  it('reads null for every agent when no Bash hook named the wait', () => {
    for (const [name, screen] of NEGATIVES) {
      for (const agent of ['claude', 'codex']) expect(readScreen(agent, screen), `${agent} ${name}`).toBeNull();
    }
  });

  it('Claude\'s Edit prompt is not admitted: its hook is no Bash request (D11)', () => {
    const edit = JSON.stringify({
      hook_event_name: 'PermissionRequest',
      tool_name: 'Edit',
      tool_input: { file_path: 'note.txt', old_string: 'hello', new_string: 'HELLO' }
    });
    expect(readScreen('claude', plainFixture('claude-edit.txt'), edit)).toBeNull();
  });

  it('a resized Claude dialog whose hook question was cleared stays unpressable (§12, research 135 §9 item 1)', () => {
    const resized = plainFixture('claude-bash-resized-reconstructed.txt');
    expect(readScreen('claude', resized)).toBeNull();
    // The resize moved the choice the monitor marks: option 2 was cut at the width.
    const before = detectDialogRows(normalizeCapture(plainFixture('claude-bash-2.1.287.txt')));
    const after = detectDialogRows(normalizeCapture(resized));
    expect(after.options[1]?.text).not.toBe(before.options[1]?.text);
  });

  it('a non-agent program\'s dialog under a Claude Bash hook DOES read as the shape: the foreground check is what refuses it', () => {
    // Pinned so nobody reads this module as the guard: reader.test.ts proves the
    // foreground refusal, and probe:p318 arm R12 drives it.
    expect(
      readScreen('claude', plainFixture('non-agent-proceed-reconstructed.txt'), bashBody('touch x'))?.shape
    ).toBe('claude-permission');
  });
});

describe('the options a shape takes', () => {
  const real = plainFixture('codex-approval-no-reason-0.160.0.txt');

  it('needs markers 1 to k, consecutive, 2 to 9 of them', () => {
    expect(readScreen('codex', real.replace('  2. Yes, and', '  4. Yes, and'))).toBeNull();
    // 1, 2, 4: increasing, so the detector carries all three, and the last is Codex's No.
    const gap = real.replace('  3. No, and tell Codex', '  4. No, and tell Codex');
    expect(detectDialogRows(normalizeCapture(gap)).options.map((o) => o.marker)).toEqual(['1', '2', '4']);
    expect(readScreen('codex', gap)).toBeNull();
    const two = real.replace(/  2\. Yes, and[^\n]*\n/, '').replace('  3. No, and tell Codex', '  2. No, and tell Codex');
    expect(readScreen('codex', two)?.markers).toEqual(['1', '2']);
    const one = real.replace(/  2\. Yes, and[^\n]*\n/, '').replace(/  3\. No, and tell Codex[^\n]*\n/, '');
    expect(readScreen('codex', one)).toBeNull();
    const many = real.replace(
      '  3. No, and tell Codex what to do differently (esc)',
      Array.from({ length: 8 }, (_, i) => `  ${String(i + 3)}. Maybe ${String(i)}`).join('\n') +
        '\n  11. No, and tell Codex what to do differently (esc)'
    );
    expect(readScreen('codex', many)).toBeNull();
  });

  it('Claude\'s needs its question row to start "Do you want to" and a Bash hook', () => {
    const screen = plainFixture('claude-bash-2.1.287.txt');
    const body = hookBodies()[0] ?? null;
    expect(readScreen('claude', screen.replace('Do you want to proceed?', 'Shall I proceed?'), body)).toBeNull();
    expect(readScreen('claude', screen, null)).toBeNull();
  });

  it('pressableOf: every marker when said, else the ones that say No', () => {
    const said: PressReading = { shape: 'claude-permission', markers: ['1', '2'], deny: ['2'], runs: 'Bash ls', command: null };
    expect(pressableOf(said)).toEqual(['1', '2']);
    expect(pressableOf({ ...said, runs: null })).toEqual(['2']);
  });

  it('"No" is a word: an option reading "Not now" is not a No', () => {
    const screen = plainFixture('claude-bash-multiline-2.1.287.txt').replace('   4. No\n', '   4. Not now\n');
    const reading = readScreen('claude', screen, hookBodies()[1] ?? null);
    expect(reading?.deny).toEqual([]);
    expect(reading === null ? null : pressableOf(reading)).toEqual([]);
  });
});
