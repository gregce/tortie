/**
 * Unit tests for the restore stream's pure helpers (no electron/tmux).
 */

import { describe, expect, it } from 'vitest';
import {
  buildArmedCommand,
  buildSnapshotReplayCommand,
  shellQuoteArg,
  shellQuoteArgv,
  stripAnsi,
  trimSnapshotText
} from '../command';

describe('shellQuoteArg', () => {
  it('passes safe args through unquoted', () => {
    expect(shellQuoteArg('claude')).toBe('claude');
    expect(shellQuoteArg('--resume')).toBe('--resume');
    expect(shellQuoteArg('9f8d2a51-1234-4abc-9def-000011112222')).toBe(
      '9f8d2a51-1234-4abc-9def-000011112222'
    );
    expect(shellQuoteArg('/Users/gdc/src/webapp')).toBe('/Users/gdc/src/webapp');
    expect(shellQuoteArg('KEY=value,x')).toBe('KEY=value,x');
  });

  it('single-quotes anything with spaces or shell metacharacters', () => {
    expect(shellQuoteArg('two words')).toBe("'two words'");
    expect(shellQuoteArg('a;b')).toBe("'a;b'");
    expect(shellQuoteArg('$(rm -rf /)')).toBe("'$(rm -rf /)'");
    expect(shellQuoteArg('a&&b|c>d')).toBe("'a&&b|c>d'");
  });

  /**
   * PHASE 117. zsh, which is the login shell macOS ships, replaces a word whose
   * FIRST character is `=` with the path of the program named after it.
   * MEASURED 2026-08-20 with zsh 5.9:
   *
   *   zsh -c 'echo =p117-absent-1'     zsh:1: p117-absent-1 not found, exit 1
   *   zsh -c "echo '=p117-absent-1'"   =p117-absent-1, exit 0
   *
   * Tortie sends `=NAME` to tmux on another machine as an exact match target, so
   * such a word has to leave here quoted. A `=` inside a word is untouched by
   * that expansion and still passes through, which keeps a resume command typed
   * into a pane reading the way a person would type it.
   */
  it('quotes a leading equals and leaves an inner one alone', () => {
    expect(shellQuoteArg('=p117-absent-1')).toBe("'=p117-absent-1'");
    expect(shellQuoteArg('=$3')).toBe("'=$3'");
    expect(shellQuoteArg('--model=opus')).toBe('--model=opus');
    expect(shellQuoteArg('KEY=value')).toBe('KEY=value');
    expect(shellQuoteArg('=')).toBe("'='");
  });

  it('escapes embedded single quotes POSIX-style', () => {
    expect(shellQuoteArg("it's")).toBe("'it'\\''s'");
  });

  it('renders the empty arg as empty quotes', () => {
    expect(shellQuoteArg('')).toBe("''");
  });
});

describe('shellQuoteArgv / buildArmedCommand', () => {
  it('joins a resume argv into one typed line', () => {
    expect(buildArmedCommand(['claude', '--resume', 'abc-123'])).toBe(
      'claude --resume abc-123'
    );
  });

  it('quotes flags that need it (recorded launch extras)', () => {
    expect(
      buildArmedCommand(['claude', '--resume', 'abc', '--add-dir', '/tmp/my dir'])
    ).toBe("claude --resume abc --add-dir '/tmp/my dir'");
  });

  it('arms nothing for empty argv (plain shells)', () => {
    expect(buildArmedCommand([])).toBe('');
  });

  it('quotes codex resume the same way', () => {
    expect(shellQuoteArgv(['codex', 'resume', 'uuid-1'])).toBe(
      'codex resume uuid-1'
    );
  });
});

describe('buildSnapshotReplayCommand', () => {
  const cmd = buildSnapshotReplayCommand('/Users/g/Library/snap/ab c.txt');

  it('starts with a space (skips shell history w/ HIST_IGNORE_SPACE)', () => {
    expect(cmd.startsWith(' ')).toBe(true);
  });

  it('cats the (quoted) snapshot and prints a separator', () => {
    expect(cmd).toContain("cat '/Users/g/Library/snap/ab c.txt'");
    expect(cmd).toContain('printf');
  });

  it('never uses clear(1) — E3 would erase the replayed tmux history', () => {
    expect(/\bclear\b/.test(cmd)).toBe(false);
  });
});

describe('trimSnapshotText', () => {
  it('drops trailing blank lines and guarantees a final newline', () => {
    expect(trimSnapshotText('a\nb\n\n\n\n')).toBe('a\nb\n');
  });

  it('treats ANSI-only trailing lines as blank', () => {
    expect(trimSnapshotText('out\n\u001b[0m \u001b[K\n\n')).toBe('out\n');
  });

  it('keeps interior blank lines intact', () => {
    expect(trimSnapshotText('a\n\nb\n\n')).toBe('a\n\nb\n');
  });

  it('returns empty for effectively empty captures', () => {
    expect(trimSnapshotText('\n\n \n')).toBe('');
    expect(trimSnapshotText('')).toBe('');
  });
});

describe('stripAnsi', () => {
  it('removes CSI color/cursor sequences', () => {
    expect(stripAnsi('\u001b[1;32mhi\u001b[0m there\u001b[2K')).toBe('hi there');
  });

  it('removes OSC sequences (BEL- and ST-terminated)', () => {
    expect(stripAnsi('\u001b]0;title\u0007text')).toBe('text');
    expect(stripAnsi('\u001b]8;;http://x\u001b\\link\u001b]8;;\u001b\\')).toBe(
      'link'
    );
  });

  it('leaves plain text alone', () => {
    expect(stripAnsi('claude --resume abc')).toBe('claude --resume abc');
  });
});
