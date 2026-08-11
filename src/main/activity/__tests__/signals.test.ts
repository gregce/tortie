/**
 * Activity signal tiers — pure-parser and pure-predicate tests (Phase 13).
 *
 * The screen fixtures are REAL captures taken off the private `-L gmux`
 * server on 2026-08-10 (claude 2.1.226, codex 0.147.0, qwen 0.21.7, pi, zsh),
 * including a genuine workspace-trust gate and a genuine "Do you want to make
 * this edit?" permission prompt. They are the corpus that pins the one
 * generic needs-input detector honest: it must fire on both dialogs and on
 * NOTHING else, including the screen claude leaves behind right after the
 * user answers.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  parseClaudeSessionFile,
  parsePaneIdFromTmuxField
} from '../claude-registry';
import { claudeVerdict, codexTitleVerdict, shellVerdict } from '../oracles';
import { PANE_FORMAT, parsePaneLines } from '../panes';
import {
  cpuPercent,
  descendants,
  hasToolChild,
  isDescendantOf,
  parseCpuTime,
  parseProcTable,
  subtreeCpuSeconds
} from '../process';
import {
  detectDialog,
  excerptFromCapture,
  hashScreen,
  normalizeCapture,
  ScreenMemory
} from '../screen';

const fixture = (name: string): string =>
  readFileSync(join(__dirname, 'fixtures', name), 'utf8');

// ---------------------------------------------------------------------------
// Tier 1 — the pane format
// ---------------------------------------------------------------------------

describe('parsePaneLines', () => {
  const line = (fields: string[]): string => fields.join('\t');

  it('parses a real claude pane', () => {
    const facts = parsePaneLines(
      line([
        '$335',
        '%336',
        '99276',
        '1',
        '0',
        '',
        '',
        '1786397944',
        '0',
        '0',
        '0',
        '14867',
        '25000',
        '2.1.226',
        '✳ Review Zen of Tortie documentation'
      ])
    );
    const pane = facts.get('$335');
    expect(pane).toBeDefined();
    expect(pane?.paneId).toBe('%336');
    expect(pane?.panePid).toBe(99276);
    expect(pane?.activityAt).toBe(1786397944 * 1000);
    expect(pane?.title).toBe('✳ Review Zen of Tortie documentation');
    expect(pane?.dead).toBe(false);
    expect(pane?.deadStatus).toBeUndefined();
    // Phase 13.7 — the two depth fields ride this same read.
    expect(pane?.historySize).toBe(14867);
    expect(pane?.historyLimit).toBe(25000);
  });

  it('keeps everything after the last field in the title (tabs included)', () => {
    const facts = parsePaneLines(
      line([
        '$1', '%1', '10', '1', '0', '', '', '100', '1', '0', '0',
        '0', '25000', 'zsh', 'a\tb'
      ])
    );
    expect(facts.get('$1')?.title).toBe('a\tb');
  });

  it('prefers the ACTIVE pane when a session has several', () => {
    const out = [
      line([
        '$9', '%1', '10', '0', '0', '', '', '100', '0', '0', '0',
        '0', '25000', 'zsh', 'first'
      ]),
      line([
        '$9', '%2', '11', '1', '0', '', '', '101', '0', '0', '0',
        '0', '25000', 'zsh', 'active'
      ]),
      line([
        '$9', '%3', '12', '0', '0', '', '', '102', '0', '0', '0',
        '0', '25000', 'zsh', 'last'
      ])
    ].join('\n');
    expect(parsePaneLines(out).get('$9')?.title).toBe('active');
  });

  it('reads a dead pane and its exit code', () => {
    const facts = parsePaneLines(
      line([
        '$2', '%5', '0', '1', '1', '143', '', '99', '0', '0', '0',
        '0', '25000', 'zsh', ''
      ])
    );
    expect(facts.get('$2')?.dead).toBe(true);
    expect(facts.get('$2')?.deadStatus).toBe(143);
    expect(facts.get('$2')?.deadSignal).toBeUndefined();
  });

  it('reads a pane killed BY a signal — empty status, signal set', () => {
    // Measured on tmux 3.6a (research 21 §3): `kill -TERM` on a process that
    // does not trap the signal reports dead_status EMPTY and dead_signal
    // "term". Reading only the status is how a targeted kill became a
    // session that "just exited".
    const facts = parsePaneLines(
      line([
        '$3', '%9', '0', '1', '1', '', 'term', '99', '0', '0', '0',
        '0', '25000', 'sleep', ''
      ])
    );
    expect(facts.get('$3')?.dead).toBe(true);
    expect(facts.get('$3')?.deadStatus).toBeUndefined();
    expect(facts.get('$3')?.deadSignal).toBe('term');
  });

  it('never asks tmux for window_bell_flag or session_activity', () => {
    // A BEL is an OSC string terminator in practice (133/133 captured) and
    // codex fires one ~10 times a second WHILE working; session_activity
    // tracks clients, not output. Both rules are deleted, not tuned.
    expect(PANE_FORMAT).not.toContain('bell');
    expect(PANE_FORMAT).not.toContain('session_activity');
    expect(PANE_FORMAT).toContain('#{window_activity}');
  });

  it('keeps pane_title LAST and the depth fields before the command', () => {
    // The parser is POSITIONAL and `pane_title` is the one field whose
    // content is arbitrary, so a field inserted after it silently corrupts
    // agent state detection rather than failing loudly. Phase 13.7 inserted
    // two; this pins the order so the next insertion cannot get it wrong.
    const fields = PANE_FORMAT.split('\t');
    expect(fields[fields.length - 1]).toBe('#{pane_title}');
    expect(fields.indexOf('#{history_size}')).toBeLessThan(
      fields.indexOf('#{pane_current_command}')
    );
    expect(fields.indexOf('#{history_limit}')).toBeLessThan(
      fields.indexOf('#{pane_current_command}')
    );
    // #{history_bytes} is the honest memory source but nothing in the
    // always-on tier can act on it — it is read on demand instead.
    expect(PANE_FORMAT).not.toContain('history_bytes');
  });
});

// ---------------------------------------------------------------------------
// Tier 0 — claude's session registry
// ---------------------------------------------------------------------------

describe('claude session registry', () => {
  it('maps by pane id, never by the session NAME (which goes stale)', () => {
    // Live trap: this file said "claude-1" long after the user renamed the
    // session to "zen of tortie". The %N never lies.
    expect(parsePaneIdFromTmuxField('claude-1:@335.%336')).toBe('%336');
    expect(parsePaneIdFromTmuxField(null)).toBeUndefined();
    expect(parsePaneIdFromTmuxField(undefined)).toBeUndefined();
  });

  it('accepts a current interactive entry', () => {
    const entry = parseClaudeSessionFile(
      JSON.stringify({
        pid: 99276,
        kind: 'interactive',
        version: '2.1.226',
        tmux: 'claude-1:@335.%336',
        status: 'waiting',
        waitingFor: 'permission prompt',
        statusUpdatedAt: 1786397929384
      })
    );
    expect(entry).toMatchObject({
      pid: 99276,
      status: 'waiting',
      waitingFor: 'permission prompt',
      paneId: '%336'
    });
  });

  it('ignores an entry with no status (older build) rather than calling it idle', () => {
    expect(
      parseClaudeSessionFile(
        JSON.stringify({
          pid: 61483,
          kind: 'interactive',
          version: '2.1.220',
          entrypoint: 'claude-vscode'
        })
      )
    ).toBeNull();
  });

  it('accepts an entry with "tmux": null but leaves it unmapped', () => {
    const entry = parseClaudeSessionFile(
      JSON.stringify({ pid: 2983, kind: 'interactive', tmux: null, status: 'busy' })
    );
    expect(entry?.paneId).toBeUndefined();
    expect(entry?.status).toBe('busy');
  });

  it('ignores non-interactive entries and junk', () => {
    expect(
      parseClaudeSessionFile(JSON.stringify({ pid: 1, kind: 'print', status: 'busy' }))
    ).toBeNull();
    expect(parseClaudeSessionFile('not json')).toBeNull();
    expect(parseClaudeSessionFile('null')).toBeNull();
  });
});

describe('claudeVerdict', () => {
  const at = { pid: 1, statusUpdatedAt: 0 };
  it('busy is working', () => {
    expect(claudeVerdict({ ...at, status: 'busy' }).state).toBe('working');
  });
  it('waiting is needs_input and carries claude own reason', () => {
    expect(
      claudeVerdict({ ...at, status: 'waiting', waitingFor: 'permission prompt' })
    ).toEqual({ state: 'needs_input', tier: 'native', reason: 'permission prompt' });
  });
  it('idle and shell are both idle', () => {
    // `shell` is claude's "idle, with a background shell still running": the
    // turn ENDED and the user can type, which is idle from the dot's point of
    // view (research 18 §2.3 lists idle as pid-file `idle`/`shell`).
    expect(claudeVerdict({ ...at, status: 'idle' }).state).toBe('idle');
    expect(claudeVerdict({ ...at, status: 'shell' }).state).toBe('idle');
  });
});

// ---------------------------------------------------------------------------
// Tier 0 — codex's pane title
// ---------------------------------------------------------------------------

describe('codexTitleVerdict', () => {
  const cwd = '/Users/gdc/gmux';
  it('reads a braille spinner frame as working', () => {
    // Observed live on the user's own codex pane: "⠴ gmux".
    expect(codexTitleVerdict('⠴ gmux', cwd)?.state).toBe('working');
    expect(codexTitleVerdict('⠙ work', '/a/work')?.state).toBe('working');
  });
  it('reads the attention banner as needs_input', () => {
    expect(codexTitleVerdict('[ ! ] Action Required | gmux', cwd)?.state).toBe(
      'needs_input'
    );
  });
  it('reads the bare cwd basename as idle', () => {
    expect(codexTitleVerdict('gmux', cwd)?.state).toBe('idle');
  });
  it('declines to guess before codex has titled the pane', () => {
    // A fresh pane still carries the hostname; the floor answers instead.
    expect(codexTitleVerdict('Gregs-MacBook-Pro-2.local', cwd)).toBeNull();
    expect(codexTitleVerdict('', cwd)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Tier 0 — shells
// ---------------------------------------------------------------------------

describe('shellVerdict', () => {
  it('keypad set means sitting at the prompt', () => {
    expect(shellVerdict(true, false).state).toBe('idle');
  });
  it('a full-screen app owning the terminal is never "working"', () => {
    expect(shellVerdict(false, true).state).toBe('idle');
  });
  it('no keypad and no alt screen means a command is running', () => {
    expect(shellVerdict(false, false).state).toBe('working');
  });
});

// ---------------------------------------------------------------------------
// Tier 2 — the process subtree
// ---------------------------------------------------------------------------

describe('process snapshot', () => {
  // Shape recorded live while a floor-tier stand-in ran a setsid'd `sleep 22`:
  //   28636 pane zsh          Ss+
  //   30162 python3           S+     (the "agent")
  //   30163 /bin/sleep 22     Ss     (the setsid'd tool child)
  const table = [
    '    1     0  18:18.61 Ss  ',
    '28636     1   0:00.40 Ss+ ',
    '30162 28636   0:00.02 S+  ',
    '30163 30162   0:00.00 Ss  '
  ].join('\n');
  const snap = parseProcTable(table, 1_000);

  it('parses macOS TIME, including unwrapped minutes', () => {
    expect(parseCpuTime('0:00.03')).toBeCloseTo(0.03);
    expect(parseCpuTime('77:54.08')).toBeCloseTo(77 * 60 + 54.08);
    expect(parseCpuTime('1:02:03.00')).toBeCloseTo(3723);
    expect(parseCpuTime('2-01:00:00.00')).toBeCloseTo(2 * 86400 + 3600);
    expect(parseCpuTime('garbage')).toBe(0);
  });

  it('walks the subtree', () => {
    expect(descendants(snap, 28636).sort()).toEqual([30162, 30163]);
    expect(subtreeCpuSeconds(snap, 28636)).toBeCloseTo(0.42);
  });

  it('sees a setsid tool child (s without +)', () => {
    expect(hasToolChild(snap, 28636)).toBe(true);
  });

  it('does NOT see claude own caffeinate (S+) as a tool child', () => {
    // claude spawns caffeinate at turn start and reaps it ~30 s AFTER the
    // turn ends; a naive child-count rule sticks on "working" for that long.
    const withCaffeinate = parseProcTable(
      ['500     1   0:00.10 Ss+ ', '501   500   0:00.01 S+  '].join('\n'),
      1_000
    );
    expect(hasToolChild(withCaffeinate, 500)).toBe(false);
  });

  it('resolves ancestry for the restore shape (pane runs $SHELL, agent is a child)', () => {
    expect(isDescendantOf(snap, 30163, 28636)).toBe(true);
    expect(isDescendantOf(snap, 28636, 28636)).toBe(true);
    expect(isDescendantOf(snap, 28636, 30162)).toBe(false);
  });

  it('clamps a negative delta (a reaped child) instead of going backwards', () => {
    expect(cpuPercent(10, 5, 1_000)).toBe(0);
    expect(cpuPercent(10, 10.06, 1_000)).toBeCloseTo(6);
    expect(cpuPercent(0, 1, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Tier 3 — the screen
// ---------------------------------------------------------------------------

describe('screen normalization', () => {
  it('rstrips rows and drops trailing blank lines, and nothing else', () => {
    expect(normalizeCapture('a   \nb\t\n\n\n')).toBe('a\nb');
  });

  it('does NOT mask spinners or timers', () => {
    // Masking them tripled the miss rate: during claude thinking phase the
    // spinner line is the only changing line on the whole screen.
    const a = normalizeCapture('✻ Actioning… (3s · thinking with high effort)');
    const b = normalizeCapture('✢ Actioning… (13s · still thinking with high effort)');
    expect(hashScreen(a)).not.toBe(hashScreen(b));
  });

  it('hashes identical screens identically', () => {
    expect(hashScreen('x')).toBe(hashScreen('x'));
    expect(hashScreen('x')).not.toBe(hashScreen('y'));
  });
});

describe('ScreenMemory (K-tick memory)', () => {
  it('holds "working" across a run of identical captures', () => {
    // Codex repaints only when a paragraph completes and produces runs of
    // five identical captures mid-stream; a 1-tick predicate misses 49 % of
    // its working ticks.
    const mem = new ScreenMemory(5);
    expect(mem.note('a')).toBe(false); // first sight is not evidence
    expect(mem.note('b')).toBe(true); // changed
    expect(mem.note('b')).toBe(true); // …within the last 5
    expect(mem.note('b')).toBe(true);
    expect(mem.note('b')).toBe(true);
    expect(mem.note('b')).toBe(true);
    expect(mem.note('b')).toBe(false); // five quiet observations → settled
  });
});

describe('the one generic needs-input dialog detector', () => {
  it('fires on a REAL claude permission prompt', () => {
    expect(detectDialog(fixture('claude-permission-prompt.txt'))).toBe(true);
  });

  it('fires on a REAL claude workspace-trust gate', () => {
    // The ~35 s startup window where claude has no pid file yet.
    expect(detectDialog(fixture('claude-workspace-trust.txt'))).toBe(true);
  });

  it('fires on that gate in a TALL pane, where it is drawn at the top', () => {
    // A real gmux pane is ~42 rows, not 80x24: the gate renders at the top
    // with blank padding under it. Counting the window up from the bottom of
    // the raw capture landed entirely inside that padding, so the first
    // prompt every new project shows was invisible to the status dot, ⌘J and
    // the menu-bar sentinel while the session sat blocked.
    const tall = fixture('claude-workspace-trust.txt') + '\n'.repeat(18);
    expect(tall.split('\n').length).toBeGreaterThan(42);
    expect(detectDialog(tall)).toBe(true);
    expect(detectDialog(normalizeCapture(tall))).toBe(true);
  });

  it('is silent on the screen claude leaves right AFTER the user answers', () => {
    expect(detectDialog(fixture('claude-post-answer.txt'))).toBe(false);
  });

  it.each([
    ['claude-idle.txt'],
    ['codex-idle.txt'],
    ['qwen-idle.txt'],
    ['pi-idle.txt'],
    ['shell-idle.txt']
  ])('is silent on a real idle screen: %s', (name) => {
    expect(detectDialog(fixture(name))).toBe(false);
    // …and still silent once the window is measured from the last inked row,
    // which is what lets it see a gate drawn at the top of a tall pane.
    expect(detectDialog(fixture(name) + '\n'.repeat(18))).toBe(false);
  });

  it('needs options AND a hint — a numbered list alone is not a dialog', () => {
    expect(detectDialog('1. apples\n2. pears\n3. plums')).toBe(false);
  });
});

describe('excerptFromCapture', () => {
  it('takes the last non-empty line', () => {
    expect(excerptFromCapture('one\ntwo\n\n   \n')).toBe('two');
    expect(excerptFromCapture('\n\n')).toBe('');
  });
  it('caps the length', () => {
    expect(excerptFromCapture('x'.repeat(500)).length).toBe(120);
  });
});
