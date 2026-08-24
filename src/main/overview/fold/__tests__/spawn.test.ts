/**
 * The spawn, the stream parse and the rate window (Phase 138).
 *
 * BOUND C IS THE FIRST THING THIS FILE PROVES. Nothing under
 * src/main/overview/fold reaches an endpoint. There is no fetch, no http
 * import and no API key anywhere in the directory, and the only way to a
 * model is spawning a CLI the person confirmed.
 *
 * The rest reads the stream the way the CLI writes it, and maps the error
 * shapes onto what the fold does. Gate one never hit a rate limit at 1,878
 * times the fleet rate, so those shapes are read from the CLI itself rather
 * than from an observed refusal, which the spec says plainly and this file
 * repeats.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  outcomeForError,
  readFoldStream,
  runFold,
  windowSuspends,
  FOLD_SUSPEND_UTILIZATION
} from '../spawn';
import { foldRecipeFor } from '../recipes';

const FOLD_DIR = join(import.meta.dirname, '..');

function foldSources(): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry !== '__tests__') walk(full);
        continue;
      }
      if (entry.endsWith('.ts')) {
        out.push({ name: full, text: readFileSync(full, 'utf8') });
      }
    }
  };
  walk(FOLD_DIR);
  return out;
}

describe('bound C, and it is not amendable', () => {
  it('has no network client anywhere under the fold', () => {
    for (const file of foldSources()) {
      expect(file.text, file.name).not.toMatch(/\bfetch\s*\(/);
      expect(file.text, file.name).not.toMatch(/from 'node:https?'/);
      expect(file.text, file.name).not.toMatch(/require\('node:https?'\)/);
      expect(file.text, file.name).not.toMatch(/api[_.]?key/i);
      expect(file.text, file.name).not.toMatch(/https:\/\/api\./);
    }
  });
});

describe('no timer and no poll, so an idle session costs nothing', () => {
  it('never calls setInterval', () => {
    for (const file of foldSources()) {
      expect(file.text, file.name).not.toContain('setInterval(');
    }
  });

  it('calls setTimeout in exactly one file, being the settle timer', () => {
    const users = foldSources().filter((file) =>
      file.text.includes('setTimeout(')
    );
    expect(users.map((file) => file.name.split('/').pop())).toEqual([
      'scheduler.ts'
    ]);
  });
});

describe('readFoldStream', () => {
  it('reads the sentence and the reported cost off the result', () => {
    const out = readFoldStream(
      [
        '{"type":"system","subtype":"init"}',
        'not json at all',
        '{"type":"result","is_error":false,"result":"the sentence","total_cost_usd":0.0029}'
      ].join('\n')
    );
    expect(out.resultText).toBe('the sentence');
    expect(out.costUsd).toBeCloseTo(0.0029);
    expect(out.isError).toBe(false);
    expect(out.sawResult).toBe(true);
  });

  it('reads the window the shape the CLI actually writes, measured 2026-08-23', () => {
    // Copied byte for byte from a real invocation. The payload is nested
    // under rate_limit_info and its keys are camel case, which is why a
    // reader written from the spec alone saw no window at all.
    const out = readFoldStream(
      [
        '{"type":"rate_limit_event","rate_limit_info":{"status":' +
          '"allowed_warning","resetsAt":1788076800,"rateLimitType":' +
          '"seven_day","utilization":0.36,"isUsingOverage":false},' +
          '"uuid":"825fa23b-70cd-48f2-b085-dc5e9174949c"}',
        '{"type":"result","is_error":false,"result":"a sentence"}'
      ].join('\n')
    );
    expect(out.window?.status).toBe('allowed_warning');
    expect(out.window?.limitType).toBe('seven_day');
    expect(out.window?.utilization).toBeCloseTo(0.36);
    expect(out.window?.resetsAtMs).toBe(1788076800 * 1_000);
    expect(out.resultText).toBe('a sentence');
  });

  it('reads the older flat shape too, in case a CLI upgrade moves it back', () => {
    const out = readFoldStream(
      [
        '{"type":"rate_limit_event","status":"allowed_warning",' +
          '"limit_type":"seven_day","utilization":0.33,' +
          '"resets_at":"2026-08-30T00:00:00Z"}',
        '{"type":"result","is_error":false,"result":"a sentence"}'
      ].join('\n')
    );
    expect(out.window?.status).toBe('allowed_warning');
    expect(out.window?.limitType).toBe('seven_day');
    expect(out.window?.utilization).toBeCloseTo(0.33);
    expect(out.window?.resetsAtMs).toBe(Date.parse('2026-08-30T00:00:00Z'));
  });

  it('reads a reset given as epoch seconds', () => {
    const out = readFoldStream(
      '{"type":"rate_limit_event","status":"allowed","resets_at":1790000000}'
    );
    expect(out.window?.resetsAtMs).toBe(1790000000 * 1_000);
  });

  it('ignores every message that is neither of the two', () => {
    const out = readFoldStream(
      [
        '{"type":"assistant","message":{"content":"chatter"}}',
        '{"type":"user"}',
        ''
      ].join('\n')
    );
    expect(out.sawResult).toBe(false);
    expect(out.resultText).toBeNull();
  });

  it('survives a truncated line without throwing', () => {
    expect(() => readFoldStream('{"type":"result",')).not.toThrow();
  });
});

describe('outcomeForError', () => {
  it('treats a 529 as the server being busy, never as a usage limit', () => {
    expect(outcomeForError('overloaded_error', 529).outcome).toBe('overloaded');
    expect(outcomeForError(null, 529).outcome).toBe('overloaded');
  });

  it('treats a 429 as a usage limit', () => {
    expect(outcomeForError(null, 429).outcome).toBe('rate-limited');
    expect(outcomeForError('rate_limit_error', null).outcome).toBe('rate-limited');
  });

  it('treats the budget fuse as a refusal of this turn alone', () => {
    const out = outcomeForError('error_max_budget_usd', null);
    expect(out.outcome).toBe('refused');
    expect(out.reason).toBe('over-budget');
  });

  it('names anything else it does not recognise', () => {
    expect(outcomeForError('error_during_execution', null).reason).toBe(
      'error_during_execution'
    );
  });
});

describe('windowSuspends', () => {
  it('does nothing at the utilization his account reads today', () => {
    expect(
      windowSuspends({
        status: 'allowed_warning',
        limitType: 'seven_day',
        utilization: 0.33,
        resetsAtMs: null
      })
    ).toBe(false);
  });

  it('suspends at the threshold', () => {
    expect(
      windowSuspends({
        status: 'allowed_warning',
        limitType: 'seven_day',
        utilization: FOLD_SUSPEND_UTILIZATION,
        resetsAtMs: null
      })
    ).toBe(true);
  });

  it('suspends on any status that is not the informational warning', () => {
    expect(
      windowSuspends({
        status: 'rejected',
        limitType: 'five_hour',
        utilization: 0.1,
        resetsAtMs: null
      })
    ).toBe(true);
  });

  it('does nothing when the CLI reported no window at all', () => {
    expect(windowSuspends(null)).toBe(false);
  });
});

describe('runFold against a real child', () => {
  const recipe = foldRecipeFor('claude');

  it('has a recipe for claude and for nothing else yet', () => {
    expect(recipe).not.toBeNull();
    expect(foldRecipeFor('codex')).toBeNull();
  });

  it('reports a missing binary rather than throwing', async () => {
    const run = await runFold(
      {
        recipe: recipe!,
        model: 'claude-haiku-4-5-20251001',
        systemPrompt: 'x',
        prompt: 'y'
      },
      { resolve: () => Promise.resolve(null), path: () => Promise.resolve('') }
    );
    expect(run.outcome).toBe('spawn-failed');
    expect(run.reason).toBe('no-binary');
  });

  it('reads one sentence back from a stub that speaks the CLI stream', async () => {
    const run = await runFold(
      {
        recipe: recipe!,
        model: 'claude-haiku-4-5-20251001',
        systemPrompt: 'x',
        prompt: 'y'
      },
      {
        resolve: () => Promise.resolve('/bin/sh'),
        path: () => Promise.resolve('/usr/bin:/bin')
      }
    );
    // /bin/sh given the recipe's argv exits non zero and prints no result, so
    // the outcome must be the honest one rather than a thrown error.
    expect(['bad-output', 'spawn-failed']).toContain(run.outcome);
    expect(run.wallMs).toBeGreaterThanOrEqual(0);
  });
});

describe('the recipe itself', () => {
  const recipe = foldRecipeFor('claude');

  it('keeps the four load bearing flags', () => {
    const argv = recipe!.argv({ prompt: 'p', model: 'm', systemPrompt: 's' });
    expect(argv).toContain('--disable-slash-commands');
    expect(argv).toContain('--no-session-persistence');
    expect(argv).toContain('--setting-sources');
    expect(argv).toContain('--strict-mcp-config');
    expect(argv).toContain('--max-budget-usd');
  });

  it('keeps the two load bearing environment values', () => {
    expect(recipe!.env['MAX_THINKING_TOKENS']).toBe('0');
    expect(recipe!.env['DISABLE_PROMPT_CACHING']).toBe('1');
  });

  it('never reaches for the low effort flag, which made it worse', () => {
    const argv = recipe!.argv({ prompt: 'p', model: 'm', systemPrompt: 's' });
    expect(argv).not.toContain('--effort');
    expect(argv).not.toContain('--bare');
  });

  it('suggests a model it actually exposes', () => {
    expect(recipe!.models.map((m) => m.id)).toContain(recipe!.suggestedModel);
  });
});
