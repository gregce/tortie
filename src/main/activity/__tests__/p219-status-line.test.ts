/**
 * What main answers Settings when it is asked why the Claude meter is polling
 * (Phase 219, item 8), driven through the shipping function.
 *
 * WHY THIS FILE EXISTS. `claudeTapDecision` cannot be the thing a settings read
 * calls, because its third step WRITES: `ensureClaudeTapScript` creates the
 * managed status line script under userData. Opening a settings page must not
 * write a file. So `claudeStatusLineState` re-derives the two answers that are
 * pure reads and takes the third from what the last real launch decided, and
 * the two claims worth pinning are that it answers the right word and that it
 * leaves no byte behind.
 *
 * NOTHING UNDER THE PERSON'S HOME IS READ. `CLAUDE_CONFIG_DIR` is set to a
 * scratch directory for every arm, which is the same env var the shipping
 * `personStatusLineFiles` reads first, so the `homedir()` fallback is never
 * taken. `app` is mocked to a scratch userData, so the launch arm's write
 * lands there. No server is bound, no agent is started and nothing is spawned.
 */

import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const userData = mkdtempSync(join(tmpdir(), 'p219-userdata-'));
const configDir = mkdtempSync(join(tmpdir(), 'p219-claude-'));

vi.mock('electron', () => ({
  app: { getPath: () => userData }
}));

const usage = { claude: true, codex: false };
vi.mock('../../settings/store', () => ({
  getSettings: () => ({ usage })
}));

vi.mock('../../log', () => ({
  getLog: () => ({
    error: () => undefined,
    warn: () => undefined,
    info: () => undefined,
    debug: () => undefined
  })
}));

const { claudeStatusLineState, claudeTapDecision, resetLastTapRefusal, resetTapReasonLog } =
  await import('../hooks');

/** Every file under a directory, sorted, so "wrote nothing" can be measured. */
function treeOf(dir: string): string[] {
  const out: string[] = [];
  const walk = (at: string, prefix: string): void => {
    for (const entry of readdirSync(at, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(join(at, entry.name), rel);
      else out.push(rel);
    }
  };
  walk(dir, '');
  return out;
}

beforeEach(() => {
  process.env['CLAUDE_CONFIG_DIR'] = configDir;
  usage.claude = true;
  resetLastTapRefusal();
  resetTapReasonLog();
  rmSync(join(configDir, 'settings.json'), { force: true });
});

afterEach(() => {
  delete process.env['CLAUDE_CONFIG_DIR'];
});

afterAll(() => {
  rmSync(userData, { recursive: true, force: true });
  rmSync(configDir, { recursive: true, force: true });
});

describe('the word Settings is answered with', () => {
  it('is off while the switch is off, whatever is on disk', () => {
    usage.claude = false;
    writeFileSync(
      join(configDir, 'settings.json'),
      JSON.stringify({ statusLine: { type: 'command', command: 'mine' } })
    );
    expect(claudeStatusLineState()).toBe('off');
  });

  it('is installed when nothing is in the way', () => {
    expect(claudeStatusLineState()).toBe('installed');
  });

  it('is person-owns-it when the person names their own status line', () => {
    // THE ONE THE FINDING IS ABOUT. Phase 182 refused here and told nobody.
    writeFileSync(
      join(configDir, 'settings.json'),
      JSON.stringify({ statusLine: { type: 'command', command: '~/bin/mine' } })
    );
    expect(claudeStatusLineState()).toBe('person-owns-it');
  });

  it('reads the settings file that CLAUDE_CONFIG_DIR names, not the home one', () => {
    // The proof the arm above is really reading the scratch file: move the
    // env var to an empty directory and the same process answers differently.
    writeFileSync(
      join(configDir, 'settings.json'),
      JSON.stringify({ statusLine: { type: 'command', command: '~/bin/mine' } })
    );
    expect(claudeStatusLineState()).toBe('person-owns-it');
    const empty = mkdtempSync(join(tmpdir(), 'p219-empty-'));
    try {
      process.env['CLAUDE_CONFIG_DIR'] = empty;
      expect(claudeStatusLineState()).toBe('installed');
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe('the refusal that cannot be re-derived read only', () => {
  it('is remembered from the launch that met it, and cleared by one that does not', () => {
    // A launch whose script cannot be written. The stamp directory's parent is
    // made read only for the length of this arm and put back in a finally.
    const hooks = join(userData, 'gmux', 'hooks');
    mkdirSync(hooks, { recursive: true });
    chmodSync(hooks, 0o500);
    try {
      const decision = claudeTapDecision(undefined);
      expect(decision).toEqual({ install: false, reason: 'unwritable' });
      expect(claudeStatusLineState()).toBe('unwritable');
    } finally {
      chmodSync(hooks, 0o700);
    }
    // And a launch that succeeds puts it back, so the line stops being drawn.
    expect(claudeTapDecision(undefined).install).toBe(true);
    expect(claudeStatusLineState()).toBe('installed');
  });

  it('never outranks a refusal a person can still see for themselves', () => {
    const hooks = join(userData, 'gmux', 'hooks');
    mkdirSync(hooks, { recursive: true });
    chmodSync(hooks, 0o500);
    try {
      claudeTapDecision(undefined);
    } finally {
      chmodSync(hooks, 0o700);
    }
    writeFileSync(
      join(configDir, 'settings.json'),
      JSON.stringify({ statusLine: { type: 'command', command: '~/bin/mine' } })
    );
    // The person's own status line is the honest answer and it is checked
    // first, because it is the one that is true right now rather than the one
    // that was true at some earlier launch.
    expect(claudeStatusLineState()).toBe('person-owns-it');
  });
});

describe('what it leaves behind', () => {
  it('writes nothing at all, on any answer', () => {
    // This is the reason it is a separate function from claudeTapDecision.
    const before = treeOf(userData);
    const beforeConfig = treeOf(configDir);
    expect(claudeStatusLineState()).toBe('installed');
    writeFileSync(
      join(configDir, 'settings.json'),
      JSON.stringify({ statusLine: { type: 'command', command: 'mine' } })
    );
    expect(claudeStatusLineState()).toBe('person-owns-it');
    usage.claude = false;
    expect(claudeStatusLineState()).toBe('off');
    expect(treeOf(userData)).toEqual(before);
    expect(treeOf(configDir)).toEqual([...beforeConfig, 'settings.json']);
    // And in particular the managed script, which claudeTapDecision creates.
    expect(existsSync(join(userData, 'gmux', 'hooks', 'claude'))).toBe(
      before.some((f) => f.startsWith('gmux/hooks/claude'))
    );
  });
});
