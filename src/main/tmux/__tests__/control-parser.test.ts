/**
 * Unit tests for the control-mode line parser.
 *
 * Wire samples are REAL output captured from tmux 3.6a on the private
 * `-L gmux` socket (see the tmux-core build report).
 *
 * Runner: vitest (`npm test`). Assertions stay on node:assert/strict —
 * they work unchanged under vitest's node environment.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import {
  LineBuffer,
  parseControlLine,
  unescapeOctal
} from '../control-parser';

describe('parseControlLine — block guards', () => {
  it('parses %begin', () => {
    assert.deepEqual(parseControlLine('%begin 1786298646 290 0'), {
      kind: 'begin',
      timestamp: 1786298646,
      commandNumber: 290,
      flags: 0
    });
  });

  it('parses %end', () => {
    assert.deepEqual(parseControlLine('%end 1786298656 314 1'), {
      kind: 'end',
      timestamp: 1786298656,
      commandNumber: 314,
      flags: 1
    });
  });

  it('parses %error', () => {
    assert.deepEqual(parseControlLine('%error 1786298658 326 1'), {
      kind: 'command-error',
      timestamp: 1786298658,
      commandNumber: 326,
      flags: 1
    });
  });
});

describe('parseControlLine — session notifications', () => {
  it('parses %sessions-changed', () => {
    assert.deepEqual(parseControlLine('%sessions-changed'), {
      kind: 'sessions-changed'
    });
  });

  it('parses %session-changed', () => {
    assert.deepEqual(parseControlLine('%session-changed $1 gmux-control'), {
      kind: 'session-changed',
      sessionId: '$1',
      name: 'gmux-control'
    });
  });

  it('parses %session-renamed', () => {
    assert.deepEqual(parseControlLine('%session-renamed $0 gmux-selftest-c'), {
      kind: 'session-renamed',
      sessionId: '$0',
      name: 'gmux-selftest-c'
    });
  });

  it('keeps spaces in renamed session names', () => {
    assert.deepEqual(parseControlLine('%session-renamed $7 my cool name'), {
      kind: 'session-renamed',
      sessionId: '$7',
      name: 'my cool name'
    });
  });

  it('parses %session-window-changed', () => {
    assert.deepEqual(parseControlLine('%session-window-changed $0 @4'), {
      kind: 'session-window-changed',
      sessionId: '$0',
      windowId: '@4'
    });
  });

  it('downgrades malformed session notifications to other-notification', () => {
    assert.deepEqual(parseControlLine('%session-renamed nonsense'), {
      kind: 'other-notification',
      name: 'session-renamed',
      raw: '%session-renamed nonsense'
    });
    assert.deepEqual(parseControlLine('%session-window-changed $0 5'), {
      kind: 'other-notification',
      name: 'session-window-changed',
      raw: '%session-window-changed $0 5'
    });
  });
});

describe('parseControlLine — exit / output / misc', () => {
  it('parses bare %exit', () => {
    assert.deepEqual(parseControlLine('%exit'), { kind: 'exit' });
  });

  it('parses %exit with a reason', () => {
    assert.deepEqual(parseControlLine('%exit server exited'), {
      kind: 'exit',
      reason: 'server exited'
    });
  });

  it('parses %output with escaped data', () => {
    assert.deepEqual(parseControlLine('%output %5 hello\\015\\012'), {
      kind: 'output',
      paneId: '%5',
      data: 'hello\\015\\012'
    });
  });

  it('classifies unknown notifications as other-notification', () => {
    assert.deepEqual(parseControlLine('%unlinked-window-add @3'), {
      kind: 'other-notification',
      name: 'unlinked-window-add',
      raw: '%unlinked-window-add @3'
    });
  });

  it('classifies non-% lines as body (block content)', () => {
    assert.deepEqual(parseControlLine('$1\tgmux-control'), {
      kind: 'body',
      line: '$1\tgmux-control'
    });
  });

  it('tolerates trailing \\r from PTY transports', () => {
    assert.deepEqual(parseControlLine('%sessions-changed\r'), {
      kind: 'sessions-changed'
    });
  });
});

describe('unescapeOctal', () => {
  it('passes plain text through', () => {
    assert.equal(unescapeOctal('hello world'), 'hello world');
  });

  it('decodes control bytes', () => {
    assert.equal(unescapeOctal('a\\015\\012b'), 'a\r\nb');
    assert.equal(unescapeOctal('\\033[31m'), String.fromCharCode(27) + '[31m');
  });

  it('decodes escaped backslash (\\134)', () => {
    assert.equal(unescapeOctal('C:\\134path'), 'C:\\path');
  });

  it('reassembles multi-byte UTF-8 split into byte escapes (old tmux)', () => {
    // é = 0xC3 0xA9 = \303\251
    assert.equal(unescapeOctal('caf\\303\\251'), 'café');
  });

  it('leaves incomplete escapes at end-of-string literal', () => {
    assert.equal(unescapeOctal('abc\\01'), 'abc\\01');
    assert.equal(unescapeOctal('abc\\'), 'abc\\');
  });

  it('does not eat non-octal backslash sequences', () => {
    assert.equal(unescapeOctal('a\\9b'), 'a\\9b');
  });
});

describe('LineBuffer', () => {
  it('emits only complete lines, buffering the remainder', () => {
    const buf = new LineBuffer();
    assert.deepEqual(buf.push('%begin 1 2 0\n%end'), ['%begin 1 2 0']);
    assert.deepEqual(buf.push(' 1 2 0\n'), ['%end 1 2 0']);
  });

  it('handles multi-line chunks', () => {
    const buf = new LineBuffer();
    assert.deepEqual(buf.push('a\nb\nc'), ['a', 'b']);
    assert.deepEqual(buf.push('\n'), ['c']);
  });

  it('reset() drops partial data', () => {
    const buf = new LineBuffer();
    buf.push('partial');
    buf.reset();
    assert.deepEqual(buf.push('fresh\n'), ['fresh']);
  });
});

// ---------------------------------------------------------------------------
// What a connection actually sent (Phase 71, M4)
// ---------------------------------------------------------------------------

describe('the lines build/probe-control-dialect.mjs recorded over a connection', () => {
  it('reads the five line greeting the probe measured', () => {
    // Recorded 2026-08-17 from a real connection, on 3.6a and on 3.7b, and
    // identical to a local child of the same version. It is FIVE lines, not the
    // guard pair alone, and the three after the block are notifications.
    const greeting = [
      '%begin 1786998987 275 0',
      '%end 1786998987 275 0',
      '%window-add @0',
      '%sessions-changed',
      '%session-changed $0 gmux-control'
    ];
    assert.deepEqual(
      greeting.map((line) => parseControlLine(line).kind),
      ['begin', 'end', 'other-notification', 'sessions-changed', 'session-changed']
    );
  });

  it('reads the rename line with the argument order the far side sent', () => {
    const event = parseControlLine('%session-renamed $1 p71-worker-53327-2');
    assert.deepEqual(event, {
      kind: 'session-renamed',
      sessionId: '$1',
      name: 'p71-worker-53327-2'
    });
  });

  it('reads %exit with no reason, which is what a killed far side sent', () => {
    assert.deepEqual(parseControlLine('%exit'), { kind: 'exit' });
  });

  it('drops the four unnamed notifications into other-notification', () => {
    // Every one of these arrived on a live connection. None carries a fact the
    // feed reads, and the arm exists so an unknown name is never a crash.
    for (const line of [
      '%window-add @0',
      '%unlinked-window-add @1',
      '%unlinked-window-renamed @1 kernel_task',
      '%unlinked-window-close @2'
    ]) {
      assert.equal(parseControlLine(line).kind, 'other-notification');
    }
  });

  it('requires exactly three numbers on a guard, which is what both sent', () => {
    assert.equal(parseControlLine('%begin 1786998987 275 0').kind, 'begin');
    // A fourth number is not a guard this release has ever seen, and reading one
    // as a guard would pair a block to the wrong command.
    assert.equal(
      parseControlLine('%begin 1786998987 275 0 1').kind,
      'other-notification'
    );
  });
});
