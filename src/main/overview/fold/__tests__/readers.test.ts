/**
 * The five readers (Phase 138.1).
 *
 * Phase 138 shipped one reader and it read claude's stream. Four more agents
 * write four more shapes, so the parse is a field on the recipe now and each
 * one is tested against BYTES CAPTURED FROM A REAL RUN on 2026-08-23 rather
 * than against a help page. A shape that changes under a CLI upgrade fails
 * here, which is the point.
 *
 * The last test in this file is the one that matters most: no reader may
 * throw, whatever it is handed, because a reader that throws turns a fold
 * into an exception the scheduler swallows and the row nobody can read.
 */

import { describe, expect, it } from 'vitest';
import {
  readClaudeStream,
  readCodexJson,
  readCursorJson,
  readGrokJson,
  readPiNdjson,
  type FoldReader
} from '../readers';

/** Captured on 2026-08-23 from `codex exec --json`. */
const CODEX_OUT = [
  '{"type":"thread.started","thread_id":"01a031e6-3c4b-7bb2-946e-6fee24c9616f"}',
  '{"type":"turn.started"}',
  '{"type":"item.completed","item":{"id":"item_0","type":"agent_message",' +
    '"text":"They renamed a config file."}}',
  '{"type":"turn.completed","usage":{"input_tokens":14312,' +
    '"cached_input_tokens":4480,"output_tokens":23}}'
].join('\n');

/** Captured on 2026-08-23 from `cursor-agent -p --output-format json`. */
const CURSOR_OUT =
  '{"type":"result","subtype":"success","is_error":false,"duration_ms":3563,' +
  '"result":"They changed the name of a configuration file.",' +
  '"session_id":"5fef90da-1a10-4526-ac48-d608f7788b12",' +
  '"usage":{"inputTokens":2741,"outputTokens":9,"cacheReadTokens":19415}}';

/** Captured on 2026-08-23 from `grok -p --output-format json`, pretty printed. */
const GROK_OUT = [
  '{',
  '  "text": "They renamed a configuration file.",',
  '  "stopReason": "end_turn",',
  '  "usage": { "input_tokens": 14203, "output_tokens": 153 },',
  '  "num_turns": 1,',
  '  "total_cost_usd": 0.00543116',
  '}'
].join('\n');

/** Captured on 2026-08-23 from `pi -p --mode json`. */
const PI_OUT = [
  '{"type":"session","version":3,"id":"01a031de-e41d-7e6b-9784-2d8eecbda07d"}',
  '{"type":"turn_start"}',
  '{"type":"turn_end","message":{"role":"assistant","content":[{"type":' +
    '"text","text":"A person renamed a config file."}],"provider":' +
    '"deepseek","usage":{"input":89,"output":13,"cost":{"input":0.0000387,' +
    '"output":0.0000113,"total":0.000050025}},"stopReason":"stop"}}',
  '{"type":"agent_settled"}'
].join('\n');

describe('the codex reader', () => {
  it('reads the sentence off the completed agent message', () => {
    const out = readCodexJson(CODEX_OUT);
    expect(out.sawResult).toBe(true);
    expect(out.text).toBe('They renamed a config file.');
    expect(out.isError).toBe(false);
  });

  it('reports no cost, because codex reports none', () => {
    // This is the CLI's own limit and it is stated on the row rather than
    // papered over with an estimate.
    expect(readCodexJson(CODEX_OUT).costUsd).toBeNull();
  });

  it('names a failed turn rather than calling it an empty answer', () => {
    const out = readCodexJson(
      '{"type":"turn.failed","error":{"type":"usage_limit","status":429}}'
    );
    expect(out.isError).toBe(true);
    expect(out.subtype).toBe('usage_limit');
    expect(out.apiErrorStatus).toBe(429);
  });
});

describe('the cursor reader', () => {
  it('reads the sentence off the one result object', () => {
    const out = readCursorJson(CURSOR_OUT);
    expect(out.sawResult).toBe(true);
    expect(out.text).toBe('They changed the name of a configuration file.');
    expect(out.isError).toBe(false);
    expect(out.costUsd).toBeNull();
  });

  it('carries an error subtype through and drops the success one', () => {
    expect(readCursorJson(CURSOR_OUT).subtype).toBeNull();
    const bad = readCursorJson(
      '{"type":"result","subtype":"error_rate_limit","is_error":true,"result":""}'
    );
    expect(bad.isError).toBe(true);
    expect(bad.subtype).toBe('error_rate_limit');
  });
});

describe('the grok reader', () => {
  it('reads a PRETTY PRINTED object, which no line reader could', () => {
    const out = readGrokJson(GROK_OUT);
    expect(out.sawResult).toBe(true);
    expect(out.text).toBe('They renamed a configuration file.');
  });

  it('is the one recipe besides claude that reports what a fold cost', () => {
    expect(readGrokJson(GROK_OUT).costUsd).toBeCloseTo(0.00543116, 8);
  });

  it('skips a notice printed before the object', () => {
    const out = readGrokJson('You are logged in with grok.com.\n' + GROK_OUT);
    expect(out.text).toBe('They renamed a configuration file.');
  });
});

describe('the pi reader', () => {
  it('reads the sentence, and the cost to nine places, off turn_end', () => {
    const out = readPiNdjson(PI_OUT);
    expect(out.sawResult).toBe(true);
    expect(out.text).toBe('A person renamed a config file.');
    expect(out.costUsd).toBeCloseTo(0.000050025, 9);
  });

  it('ignores the user message and reads only the assistant one', () => {
    const out = readPiNdjson(
      '{"type":"message_end","message":{"role":"user","content":' +
        '[{"type":"text","text":"the ask"}]}}'
    );
    expect(out.sawResult).toBe(false);
    expect(out.text).toBeNull();
  });
});

describe('the claude reader, under its new name', () => {
  it('still reads the result and the window Phase 138 measured', () => {
    const out = readClaudeStream(
      [
        '{"type":"rate_limit_event","rate_limit_info":{"status":' +
          '"allowed_warning","resetsAt":1788076800,"rateLimitType":' +
          '"seven_day","utilization":0.36}}',
        '{"type":"result","is_error":false,"result":"a sentence",' +
          '"total_cost_usd":0.0029}'
      ].join('\n')
    );
    expect(out.text).toBe('a sentence');
    expect(out.window?.utilization).toBeCloseTo(0.36);
    expect(out.costUsd).toBeCloseTo(0.0029);
  });
});

describe('no reader throws, whatever it is handed', () => {
  const readers: [string, FoldReader][] = [
    ['claude', readClaudeStream],
    ['codex', readCodexJson],
    ['cursor', readCursorJson],
    ['grok', readGrokJson],
    ['pi', readPiNdjson]
  ];

  const junk = [
    '',
    '   ',
    'a plain sentence with no JSON in it',
    '{',
    '{"type":"result",',
    '[]',
    'null',
    '{"type":null,"item":null,"message":null,"error":null}',
    '{"message":{"role":"assistant","content":"a string, not an array"}}',
    '{"result":12345}'
  ];

  for (const [name, read] of readers) {
    it(`survives every broken shape: ${name}`, () => {
      for (const text of junk) {
        expect(() => read(text), `${name} on ${text}`).not.toThrow();
      }
    });
  }

  it('answers an empty output with sawResult false, never with a sentence', () => {
    for (const [name, read] of readers) {
      const out = read('');
      expect(out.sawResult, name).toBe(false);
      expect(out.text, name).toBeNull();
    }
  });
});
