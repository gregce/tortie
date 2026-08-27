/**
 * The readback the multi line paste matrix decides on (Phase 64 fix round).
 *
 * Every fixture below is a real screen, trimmed, captured on 2026-08-27 by
 * driving the agent named on a scratch tmux socket with no Electron involved.
 * The first two are the whole reason this file exists: under the classifier
 * that shipped in the phase's first build, `RUN_ON` reported `whole` and
 * `COLLAPSED` reported `lost`.
 */

import { describe, expect, it } from 'vitest';
import {
  P64_PROBE_LINES,
  chipAgrees,
  classifyPaste,
  keyNamedByScreen,
  probeBlock,
  probeMarker,
  readChip,
  readPasteback
} from '../p64-paste-classify';

const NONCE = 'TZ3354';
const BLOCK = probeBlock(NONCE);
const BYTES = Buffer.byteLength(BLOCK);

/** The block as an agent that honours the embedded returns shows it. */
const WHOLE = ['a prompt', ...BLOCK.split('\n'), 'a footer'].join('\n');

/**
 * deepseek, measured. One run on paragraph inside a bordered Draft box, soft
 * wrapped by the box, which is also why `TZ3354-M06` is split across two rows.
 */
const RUN_ON = [
  '┌Draft────────────────────────────────────────────┐',
  `│${BLOCK.split('\n').join('').slice(0, 197)}│`,
  `│${BLOCK.split('\n').join('').slice(197)}│`,
  '└─────────────────────────────────────────────────┘'
].join('\n');

/** claude, measured. No line of the block is on the screen at all. */
const COLLAPSED = [
  ' ▐▛███▛█   Claude Code v2.1.247',
  '❯ [Pasted text #1 +13 lines]',
  '  ⏵⏵ auto mode on (shift+tab to cycle)'
].join('\n');

describe('the probe block', () => {
  it('carries one marker per line and the marker starts the line', () => {
    const lines = BLOCK.split('\n');
    expect(lines).toHaveLength(P64_PROBE_LINES);
    lines.forEach((line, i) => {
      expect(line.startsWith(probeMarker(NONCE, i))).toBe(true);
    });
  });
});

describe('a block that arrived whole', () => {
  it('is read off the screen as whole', () => {
    const rb = readPasteback(NONCE, 'a prompt', WHOLE, WHOLE);
    expect(rb.seen).toBe(P64_PROBE_LINES);
    expect(rb.runOn).toEqual([]);
    expect(rb.inOrder).toBe(true);
    const v = classifyPaste(rb, BYTES);
    expect(v.verdict).toBe('whole');
    expect(v.readKind).toBe('screen');
  });
});

describe('the defect this fix round found', () => {
  it('calls a block whose line breaks were dropped run-on, not whole', () => {
    const rb = readPasteback(NONCE, 'a prompt', RUN_ON, RUN_ON);
    // Every line arrived, once, in order. That is exactly why the old
    // presence-only check called this whole.
    expect(rb.seen).toBe(P64_PROBE_LINES);
    expect(rb.duplicated).toEqual([]);
    expect(rb.inOrder).toBe(true);
    // And the screen carries them on two rows rather than fourteen.
    expect(rb.runOn.length).toBeGreaterThan(0);
    expect(classifyPaste(rb, BYTES).verdict).toBe('run-on');
  });

  it('finds a marker the composer soft wrapped across two rows', () => {
    // The squashed reading is what makes `seen` fourteen above. On the raw
    // rows this marker is split by the box border and is on neither of them,
    // which is the reading that would have reported a split that never
    // happened.
    const split = probeMarker(NONCE, 5);
    expect(RUN_ON.split('\n').some((l) => l.includes(split))).toBe(false);
    expect(readPasteback(NONCE, '', RUN_ON, RUN_ON).markerCounts[5]).toBe(1);
  });

  it('re-derives what the classifier that shipped would have said', () => {
    // The three markers the first build sent, and the same screen with every
    // line break thrown away. Each substring SURVIVES the concatenation, so
    // the presence-only reading answers yes to all three and the row reads
    // whole. That is the blindness, executed rather than described.
    const oldMarkers = ['ALPHA', 'BRAVO', 'CHARLIE'].map((w) => `${NONCE} ${w}`);
    const oldBlock = oldMarkers.map((m, i) => `${m} line ${String(i)}`).join('\n');
    const runOn = oldBlock.split('\n').join('');
    expect(oldMarkers.every((m) => runOn.includes(m))).toBe(true);
    // The reading this file replaced it with answers the same screen honestly.
    const now = readPasteback(NONCE, '', RUN_ON, RUN_ON);
    expect(classifyPaste(now, BYTES).verdict).toBe('run-on');
  });
});

describe('a composer that shows a chip instead of the text', () => {
  it('reads the chip rather than reporting a lost block', () => {
    const rb = readPasteback(NONCE, 'a prompt', COLLAPSED, COLLAPSED);
    expect(rb.seen).toBe(0);
    const v = classifyPaste(rb, BYTES);
    expect(v.verdict).toBe('whole');
    expect(v.readKind).toBe('chip');
    expect(v.note).toContain('[Pasted text #1 +13 lines]');
  });

  it('reads every chip spelling measured on this machine', () => {
    const chips: [string, number, string][] = [
      ['[Pasted text #1 +13 lines]', 13, 'lines'],
      ['[Pasted Text: 14 lines]', 14, 'lines'],
      ['[Pasted Content 578 chars]', 578, 'chars'],
      ['[paste #1 +14 lines]', 14, 'lines'],
      ['[Pasted: 14 lines]', 14, 'lines']
    ];
    for (const [text, count, unit] of chips) {
      const chip = readChip(`❯ ${text}`);
      expect(chip?.count).toBe(count);
      expect(chip?.unit).toBe(unit);
    }
  });

  it('refuses a chip whose count is not the block that was sent', () => {
    const rb = readPasteback(NONCE, 'a', '❯ [Pasted text #1 +2 lines]', '❯ [Pasted text #1 +2 lines]');
    expect(classifyPaste(rb, BYTES).verdict).toBe('chip-mismatch');
  });

  it('accepts a byte count chip only at the exact byte count', () => {
    const chip = readChip('[Pasted Content 578 chars]');
    expect(chip).not.toBeNull();
    expect(chipAgrees(chip!, P64_PROBE_LINES, 578)).toBe(true);
    expect(chipAgrees(chip!, P64_PROBE_LINES, 579)).toBe(false);
  });
});

describe('a composer showing a window on to the block', () => {
  /** cursor 2026.08.25, measured: the last six lines, head scrolled out. */
  const WINDOWED = [
    '  Cursor Agent',
    ...BLOCK.split('\n').slice(8),
    '  Composer 2.5 Fast'
  ].join('\n');

  it('calls a contiguous tail windowed rather than split', () => {
    const rb = readPasteback(NONCE, 'a prompt', WINDOWED, WINDOWED);
    expect(rb.seen).toBe(6);
    expect(rb.contiguousTail).toBe(true);
    const v = classifyPaste(rb, BYTES);
    expect(v.verdict).toBe('windowed');
    // It must not be counted as whole. The head is not on screen and nothing
    // on this screen says it arrived.
    expect(v.verdict).not.toBe('whole');
  });

  it('calls a gap in the middle a split, because that is not a scrolled box', () => {
    const holes = BLOCK.split('\n')
      .filter((_, i) => i !== 4 && i !== 5)
      .join('\n');
    const rb = readPasteback(NONCE, '', holes, holes);
    expect(rb.contiguousTail).toBe(false);
    expect(classifyPaste(rb, BYTES).verdict).toBe('split');
  });

  /**
   * grok 4.6, measured: a chip reading `[Pasted: 14 lines]` AND a preview
   * panel showing lines 1 to 3, the words `⋮ (8 more lines)`, then 12 to 14.
   * Reading only the screen there reports six of fourteen, which is a defect
   * that is not happening.
   */
  it('lets an agreeing chip outrank a partial preview', () => {
    const lines = BLOCK.split('\n');
    const preview = [
      ...lines.slice(0, 3),
      '⋮ (8 more lines)',
      ...lines.slice(11),
      '❯ [Pasted: 14 lines]'
    ].join('\n');
    const rb = readPasteback(NONCE, '', preview, preview);
    expect(rb.seen).toBe(6);
    const v = classifyPaste(rb, BYTES);
    expect(v.verdict).toBe('whole');
    expect(v.readKind).toBe('chip');
  });

  it('still calls a run-on a run-on even when a chip agrees', () => {
    const both = `${RUN_ON}\n❯ [Pasted: 14 lines]`;
    expect(classifyPaste(readPasteback(NONCE, '', both, both), BYTES).verdict).toBe(
      'run-on'
    );
  });
});

describe('the other three questions a presence check cannot ask', () => {
  it('calls a block that arrived twice duplicated', () => {
    const twice = [WHOLE, BLOCK].join('\n');
    expect(classifyPaste(readPasteback(NONCE, '', twice, twice), BYTES).verdict).toBe(
      'duplicated'
    );
  });

  it('calls a reordered block out-of-order', () => {
    const shuffled = [...BLOCK.split('\n')].reverse().join('\n');
    const rb = readPasteback(NONCE, '', shuffled, shuffled);
    expect(rb.seen).toBe(P64_PROBE_LINES);
    expect(rb.runOn).toEqual([]);
    expect(classifyPaste(rb, BYTES).verdict).toBe('out-of-order');
  });

  it('calls a block that climbed off the bottom an early submit', () => {
    const after = [WHOLE, 'output the person did not ask for'].join('\n');
    expect(classifyPaste(readPasteback(NONCE, '', WHOLE, after), BYTES).verdict).toBe(
      'early-submit'
    );
  });

  it('calls a pane that never changed blocked, and does not say it drew nothing', () => {
    const wizard = 'Welcome to Antigravity CLI!\nChoose your color scheme:\n  > terminal';
    const v = classifyPaste(readPasteback(NONCE, wizard, wizard, wizard), BYTES);
    expect(v.verdict).toBe('blocked');
    expect(v.note).not.toContain('drew nothing');
    expect(v.note).toContain('the screen did not change');
  });
});

describe('the key a screen names', () => {
  it('reads deepseek own instruction and returns the key it names', () => {
    expect(
      keyNamedByScreen('  Press 1/Y to trust and continue, 2/N to quit')
    ).toBe('1');
  });

  it('presses nothing at a screen that names no key', () => {
    expect(keyNamedByScreen('Choose your color scheme:\n  > terminal')).toBeNull();
    expect(keyNamedByScreen('Press any key to continue')).toBeNull();
    expect(keyNamedByScreen('Press 2/N to quit')).toBeNull();
  });
});
