/**
 * The Mac's words for a press and a message (Phase 318, build/p318/SPEC.md
 * §5.1.6, D19, D20): `REPLY_ANSWER_IN_SESSION` is the Mac's own
 * `CHOICE_NOT_PRESSABLE` spelled once more for main, read here as TEXT from the
 * renderer because main may not import it; no sentence names a tmux word; and
 * the module imports nothing.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as copy from '../reply-copy';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('src/shared/reply-copy.ts', () => {
  it('REPLY_ANSWER_IN_SESSION is CHOICE_NOT_PRESSABLE, byte for byte', () => {
    const choice = readFileSync(join(ROOT, 'src', 'renderer', 'choice.ts'), 'utf8');
    const found = /export const CHOICE_NOT_PRESSABLE = '([^']*)';/.exec(choice);
    expect(found).not.toBeNull();
    expect(copy.REPLY_ANSWER_IN_SESSION).toBe(found?.[1]);
  });

  it('holds the eight sentences the SPEC names, each one line, non-empty, ending in a full stop', () => {
    const names = Object.keys(copy).sort();
    expect(names).toEqual(
      [
        'REPLY_ANSWER_IN_SESSION',
        'REPLY_FAILED',
        'REPLY_NOT_READY',
        'REPLY_NOT_TAKEN',
        'REPLY_TEXT_CHARACTER',
        'REPLY_TEXT_EMPTY',
        'REPLY_TEXT_LONG',
        'REPLY_TYPED_UNREAD'
      ].sort()
    );
    for (const name of names) {
      const sentence = (copy as Record<string, unknown>)[name];
      expect(typeof sentence, name).toBe('string');
      expect((sentence as string).length, name).toBeGreaterThan(0);
      expect(sentence as string, name).not.toMatch(/\n/);
      expect((sentence as string).endsWith('.'), name).toBe(true);
    }
  });

  it('no sentence names a tmux word (CLAUDE.md UI rules)', () => {
    for (const [name, sentence] of Object.entries(copy)) {
      expect(String(sentence), name).not.toMatch(/\b(pane|panes|window|windows|prefix|tmux)\b/i);
    }
  });

  it('the not-taken sentence never claims nothing changed (research 135 §2.6)', () => {
    expect(copy.REPLY_NOT_TAKEN).not.toMatch(/nothing/i);
  });

  it('imports nothing', () => {
    const text = readFileSync(join(ROOT, 'src', 'shared', 'reply-copy.ts'), 'utf8');
    expect(text).not.toMatch(/^\s*import\b/m);
    expect(text).not.toMatch(/\brequire\(/);
  });
});
