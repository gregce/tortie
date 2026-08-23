/**
 * The seven defects research 63 section 19 named, each proved against a
 * fixture derived at run time. Defect 6 is proved in reader-cursor.test.ts
 * and defect 7 in reader-watermark.test.ts. Nothing here reads outside the
 * repository and nothing here is committed to the fixture corpus.
 */

import * as fs from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  fixtureLines,
  JSONL_CASES,
  keptText,
  readFixture,
  scratchDir,
  sortKeysDeep
} from './reader-helpers';

const CODEX_FILE =
  'codex-rollout-2026-08-19T10-05-03-0000aaaa-1111-7000-8000-222233334444.jsonl';

describe('defect 1, claude cli 2.1.178 sorts its keys', () => {
  it('a sorted key fixture yields the same turns and answers, and the prefilter reports wide', () => {
    const dir = scratchDir('d1');
    try {
      const pad = 'p'.repeat(700);
      const sorted = fixtureLines('claude-session.jsonl')
        .map((l) => {
          const rec = JSON.parse(l) as Record<string, unknown>;
          // Long content in front of the sorted role key pushes the marker
          // past the 512 byte head, the shape of the real 21.48 MB file.
          const msg = rec['message'] as { content?: unknown } | undefined;
          if (rec['type'] === 'assistant' && msg && Array.isArray(msg.content)) {
            msg.content = (msg.content as Array<Record<string, unknown>>).map((c) =>
              c['type'] === 'text' ? { aaa_padding: pad, ...c } : c
            );
          }
          return JSON.stringify(sortKeysDeep(rec));
        })
        .join('\n') + '\n';
      const file = join(dir, 'sorted.jsonl');
      fs.writeFileSync(file, sorted);
      const base = readFixture(JSONL_CASES['claude']!);
      const r = readFixture(JSONL_CASES['claude']!, { file });
      expect(r.acct.prefilter).toBe('wide');
      expect(r.turns.length).toBe(base.turns.length);
      expect(r.turns.filter((t) => t.answer).length).toBe(
        base.turns.filter((t) => t.answer).length
      );
      expect(r.turns[2]!.answer!.text).toBe(base.turns[2]!.answer!.text);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('defect 2, the three false claude asks', () => {
  const record = (content: string, extra: Record<string, unknown> = {}): string =>
    JSON.stringify({
      isSidechain: false,
      type: 'user',
      message: { role: 'user', content },
      timestamp: '2026-08-20T10:30:00.000Z',
      sessionId: '11111111-2222-4333-8444-555555555555',
      cwd: '/Users/dev/demo-app',
      ...extra
    });

  it('the interrupt prefix, the teammate tag and the bash notification never become asks', () => {
    const dir = scratchDir('d2');
    try {
      const lines = fixtureLines('claude-session.jsonl');
      lines.push(
        record('[Request interrupted by user for tool use]'),
        record('<teammate-message teammate_id="packager">{"type":"status"}</teammate-message>'),
        record('<bash-notification>gate finished</bash-notification>')
      );
      const file = join(dir, 'false-asks.jsonl');
      fs.writeFileSync(file, lines.join('\n') + '\n');
      const base = readFixture(JSONL_CASES['claude']!);
      const r = readFixture(JSONL_CASES['claude']!, { file });
      expect(r.turns.length).toBe(base.turns.length);
      const all = keptText(r);
      expect(all).not.toContain('for tool use');
      expect(all).not.toContain('teammate-message');
      expect(all).not.toContain('bash-notification');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never keys on teamName, a genuine ask carrying it survives', () => {
    const dir = scratchDir('d2b');
    try {
      const lines = fixtureLines('claude-session.jsonl');
      lines.push(record('are we on the cocraft branch?', { teamName: 'cocraft' }));
      const file = join(dir, 'teamname.jsonl');
      fs.writeFileSync(file, lines.join('\n') + '\n');
      const r = readFixture(JSONL_CASES['claude']!, { file });
      const base = readFixture(JSONL_CASES['claude']!);
      expect(r.turns.length).toBe(base.turns.length + 1);
      expect(r.turns[r.turns.length - 1]!.ask.text).toBe('are we on the cocraft branch?');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('defect 3, codex cli 0.139.0 writes payload first', () => {
  it('a reordered key fixture yields the same turns, and the prefilter reports wide', () => {
    const dir = scratchDir('d3');
    try {
      const reordered = fixtureLines(CODEX_FILE)
        .map((l) => {
          const rec = JSON.parse(l) as Record<string, unknown>;
          const out: Record<string, unknown> = {};
          if (rec['payload'] !== undefined) out['payload'] = rec['payload'];
          out['zz_padding'] = 'z'.repeat(300);
          for (const k of Object.keys(rec)) {
            if (k !== 'payload' && k !== 'type') out[k] = rec[k];
          }
          if (rec['type'] !== undefined) out['type'] = rec['type'];
          return JSON.stringify(out);
        })
        .join('\n') + '\n';
      const file = join(dir, 'reordered.jsonl');
      fs.writeFileSync(file, reordered);
      const base = readFixture(JSONL_CASES['codex']!);
      const r = readFixture(JSONL_CASES['codex']!, { file });
      expect(r.acct.prefilter).toBe('wide');
      expect(r.turns.length).toBe(base.turns.length);
      expect(r.turns.filter((t) => t.answer).length).toBe(
        base.turns.filter((t) => t.answer).length
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('defect 4, codex 0.87 writes no task markers', () => {
  const strip = (rewriteVersion: (l: string) => string): string[] =>
    fixtureLines(CODEX_FILE)
      .filter((l) => !l.includes('"task_started"') && !l.includes('"task_complete"'))
      .map(rewriteVersion);

  it('a 0.87 file folds ask to ask with agent_message answers', () => {
    const dir = scratchDir('d4');
    try {
      const file = join(dir, 'old.jsonl');
      fs.writeFileSync(
        file,
        strip((l) => l.replace('"cli_version":"0.147.0"', '"cli_version":"0.87.0"')).join('\n') +
          '\n'
      );
      const r = readFixture(JSONL_CASES['codex']!, { file });
      expect(r.acct.turnMode).toBe('ask-to-ask');
      expect(r.turns.length).toBeGreaterThanOrEqual(3);
      expect(r.turns[0]!.ask.text).toContain('nest counter');
      expect(r.turns[0]!.answer!.text).toContain('empty ledger');
      const last = r.turns[r.turns.length - 1]!;
      expect(last.answer!.text).toContain('v0.4.1');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a file with no version field and no closed turn re-runs ask to ask', () => {
    const dir = scratchDir('d4b');
    try {
      const file = join(dir, 'nover.jsonl');
      fs.writeFileSync(
        file,
        strip((l) => l.replace(',"cli_version":"0.147.0"', '')).join('\n') + '\n'
      );
      const r = readFixture(JSONL_CASES['codex']!, { file });
      expect(r.acct.turnMode).toBe('ask-to-ask');
      expect(r.turns.filter((t) => t.answer).length).toBeGreaterThanOrEqual(2);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a marker free file falls back whatever the version says, the real 103.90 MB file is 0.139.0', () => {
    // Measured on 2026-08-23. The file research 63 defect 4 names carries
    // cli_version 0.139.0 with zero task_started and zero task_complete, so
    // the selector is whether a task_complete was ever seen.
    const dir = scratchDir('d4c');
    try {
      const file = join(dir, 'modern-no-markers.jsonl');
      fs.writeFileSync(
        file,
        strip((l) => l.replace('"cli_version":"0.147.0"', '"cli_version":"0.139.0"')).join('\n') +
          '\n'
      );
      const r = readFixture(JSONL_CASES['codex']!, { file });
      expect(r.acct.turnMode).toBe('ask-to-ask');
      expect(r.turns.length).toBeGreaterThanOrEqual(3);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('defect 5, the codex unwrap is gated on the presence of the marker', () => {
  it('the in app browser wrapper unwraps to the request alone', () => {
    const dir = scratchDir('d5');
    try {
      const lines = fixtureLines(CODEX_FILE);
      lines.push(
        JSON.stringify({
          timestamp: '2026-08-19T14:30:00.000Z',
          type: 'event_msg',
          payload: {
            type: 'user_message',
            message:
              '# In app browser:\n- The user has the in-app browser open.\n- Current URL: file:///Users/example/rookery/index.html\n\n## My request for Codex:\nlets write a commit\n'
          }
        })
      );
      const file = join(dir, 'browser.jsonl');
      fs.writeFileSync(file, lines.join('\n') + '\n');
      const r = readFixture(JSONL_CASES['codex']!, { file });
      const last = r.turns[r.turns.length - 1]!;
      expect(last.ask.text).toContain('lets write a commit');
      expect(keptText(r)).not.toContain('In app browser');
      expect(keptText(r)).not.toContain('in-app browser');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('an attachment manifest with no request marker is dropped whole', () => {
    const dir = scratchDir('d5b');
    try {
      const lines = fixtureLines(CODEX_FILE);
      lines.push(
        JSON.stringify({
          timestamp: '2026-08-19T14:31:00.000Z',
          type: 'event_msg',
          payload: {
            type: 'user_message',
            message:
              '# Files mentioned by the user:\n\n## notes.txt: /Users/example/.codex/attachments/bbbb2222/notes.txt\n'
          }
        })
      );
      const file = join(dir, 'manifest.jsonl');
      fs.writeFileSync(file, lines.join('\n') + '\n');
      const base = readFixture(JSONL_CASES['codex']!);
      const r = readFixture(JSONL_CASES['codex']!, { file });
      expect(keptText(r)).not.toContain('attachments/');
      // The manifest joined the still open last turn as no ask at all.
      expect(r.turns[r.turns.length - 1]!.ask.queued).toBe(
        base.turns[base.turns.length - 1]!.ask.queued
      );
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
