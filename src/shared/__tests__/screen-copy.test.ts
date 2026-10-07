/**
 * The Mac's words for a session's screen and its keys (Phase 337,
 * build/p337/SPEC.md §5.4), and for a page of its history (Phase 337.1,
 * build/p3371/SPEC.md D23): exactly the eight sentences the two SPECs name,
 * each one line ending in a full stop; the feature named Terminal wherever a
 * sentence names it; the three keys refusals each say nothing was typed; no
 * sentence names a tmux word or a remote-control word; and the module imports
 * nothing.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import * as copy from '../screen-copy';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');

describe('src/shared/screen-copy.ts', () => {
  it('holds exactly the eight sentences the SPECs name, each one line, non-empty, ending in a full stop', () => {
    const names = Object.keys(copy).sort();
    expect(names).toEqual(
      [
        'SCREEN_ENDED',
        'SCREEN_KEY_CHARACTER',
        'SCREEN_NOT_TYPABLE',
        'SCREEN_QUESTION_MOVED',
        'SCREEN_TOO_LARGE',
        'SCREEN_UNREACHABLE',
        'SCROLLBACK_BUSY',
        'SCROLLBACK_MOVED'
      ].sort()
    );
    for (const name of names) {
      const sentence = (copy as Record<string, unknown>)[name];
      expect(typeof sentence, name).toBe('string');
      expect((sentence as string).length, name).toBeGreaterThan(0);
      expect(sentence as string, name).not.toMatch(/[\n\r]/);
      expect((sentence as string).endsWith('.'), name).toBe(true);
    }
  });

  it('holds the SPECs’ words byte for byte (Phase 337.1 D23 moved three and added two)', () => {
    expect(copy.SCREEN_QUESTION_MOVED).toBe(
      'The question on this session changed since your terminal was drawn. Nothing was typed.'
    );
    expect(copy.SCREEN_NOT_TYPABLE).toBe('This session cannot take keys now. Nothing was typed.');
    expect(copy.SCREEN_KEY_CHARACTER).toBe('That holds a character Tortie does not send. Nothing was typed.');
    expect(copy.SCREEN_ENDED).toBe('This session is not running, so it has no terminal.');
    expect(copy.SCREEN_UNREACHABLE).toBe(`Tortie cannot reach this session${String.fromCodePoint(0x2019)}s machine now.`);
    expect(copy.SCREEN_TOO_LARGE).toBe('This terminal is too large to show on your phone.');
    expect(copy.SCROLLBACK_MOVED).toBe('Earlier lines changed on your Mac. Go back to the live terminal to read them again.');
    expect(copy.SCROLLBACK_BUSY).toBe(`Tortie could not read this session${String.fromCodePoint(0x2019)}s earlier lines just now.`);
  });

  it('the phone calls the feature Terminal: no sentence says “screen” (his ruling, “lets do B”)', () => {
    for (const [name, sentence] of Object.entries(copy)) {
      expect(String(sentence), name).not.toMatch(/\bscreens?\b/i);
    }
  });

  it('`busy` is true of both of its causes: it names no speed and no queue (§Attack B14)', () => {
    expect(copy.SCROLLBACK_BUSY).not.toMatch(/fast|printing|queue|wait|many/i);
  });

  it('every keys refusal says nothing was typed, and no read sentence says anything about typing', () => {
    for (const s of [copy.SCREEN_QUESTION_MOVED, copy.SCREEN_NOT_TYPABLE, copy.SCREEN_KEY_CHARACTER]) {
      expect(s.endsWith(' Nothing was typed.')).toBe(true);
    }
    for (const s of [
      copy.SCREEN_ENDED,
      copy.SCREEN_UNREACHABLE,
      copy.SCREEN_TOO_LARGE,
      copy.SCROLLBACK_MOVED,
      copy.SCROLLBACK_BUSY
    ]) {
      expect(s).not.toMatch(/typed|keys?\b/i);
    }
  });

  it('no sentence names a tmux word (CLAUDE.md UI rules), nor SSH, a remote desktop or remote control', () => {
    for (const [name, sentence] of Object.entries(copy)) {
      expect(String(sentence), name).not.toMatch(/\b(pane|panes|window|windows|prefix|tmux|ssh|desktop|remote)\b/i);
    }
  });

  it('holds no control, bidi, zero-width or byte-order character', () => {
    for (const [name, sentence] of Object.entries(copy)) {
      for (const ch of String(sentence)) {
        const cp = ch.codePointAt(0) ?? 0;
        const bad =
          cp < 0x20 ||
          (cp >= 0x7f && cp <= 0x9f) ||
          (cp >= 0x200b && cp <= 0x200f) ||
          (cp >= 0x202a && cp <= 0x202e) ||
          (cp >= 0x2066 && cp <= 0x2069) ||
          cp === 0xfeff;
        expect(bad, `${name} U+${cp.toString(16)}`).toBe(false);
      }
    }
  });

  it('imports nothing', () => {
    const text = readFileSync(join(ROOT, 'src', 'shared', 'screen-copy.ts'), 'utf8');
    expect(text).not.toMatch(/^\s*import\b/m);
    expect(text).not.toMatch(/\brequire\(/);
  });
});
