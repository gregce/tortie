/**
 * Whether an agent's own prompt is empty (Phase 318, build/p318/SPEC.md §5.4.4,
 * D14; §Revision R17, R23, R24), over the REAL styled screens Claude Code
 * 2.1.287 and Codex 0.160.0 drew, checked against what was really typed
 * (real-captures.json `truth.typed`), the two RECONSTRUCTED fail-closed arms,
 * and rows built from the real ones. Control characters are built from code
 * points at run time.
 */

import { describe, expect, it } from 'vitest';
import { promptIsEmpty } from '../input-row';
import { realCaptures, styledFixture } from './fixtures';

const ESC = String.fromCharCode(0x1b);
const NBSP = String.fromCharCode(0xa0);
const RULE = `${ESC}[38;5;244m${'─'.repeat(120)}`;

/** A Claude screen: the composer row between its two rules, as 2.1.287 draws it. */
function claudeScreen(promptRow: string): string {
  return ['', '', RULE, `${ESC}[39m${promptRow}`, RULE, `${ESC}[39m  footer`, ''].join('\n');
}

/** A Codex screen: the composer row at y = 2, a blank row, then the footer. */
function codexScreen(promptRow: string, below: string[] = []): string {
  return ['  >_ OpenAI Codex', '', `${ESC}[1m›${ESC}[0m ${promptRow}`, ...below, '', '  gpt-5.4 default · /work'].join('\n');
}

describe('the real prompt rows', () => {
  it('read empty exactly when nothing was typed (R23, R24)', () => {
    const prompts = realCaptures().filter((c) => c.kind === 'prompt');
    expect(prompts).toHaveLength(14);
    for (const capture of prompts) {
      const file = capture.files[0] ?? '';
      const agent = capture.agent === 'Claude Code' ? 'claude' : 'codex';
      const cursor = agent === 'codex' ? { x: capture.cursor.x, y: capture.cursor.y } : null;
      expect(promptIsEmpty(agent, styledFixture(file), cursor), file).toBe(capture.truth.typed === '');
    }
  });

  it('a blurred Claude prompt, which draws no caret at all, still reads empty', () => {
    expect(promptIsEmpty('claude', styledFixture('claude-prompt-empty-blurred-2.1.287.ansi'), null)).toBe(true);
    expect(styledFixture('claude-prompt-empty-blurred-2.1.287.ansi')).not.toContain(`${ESC}[7m`);
  });

  it('the earlier prompts in a transcript are not the composer', () => {
    // after-decline holds three echoed `❯ P318-…` rows above the empty composer.
    expect(promptIsEmpty('claude', styledFixture('claude-prompt-after-decline-2.1.287.ansi'), null)).toBe(true);
    expect(promptIsEmpty('codex', styledFixture('codex-prompt-after-decline-0.160.0.ansi'), { x: 2, y: 25 })).toBe(true);
  });

  it('Claude draws a no-break space after its glyph, and a plain one reads the same', () => {
    const real = styledFixture('claude-prompt-empty-2.1.287.ansi');
    expect(real).toContain(`❯${NBSP}`);
    expect(promptIsEmpty('claude', real.replace(`❯${NBSP}`, '❯ '), null)).toBe(true);
  });
});

describe('the fail-closed arms (R17)', () => {
  it('a Claude draft drawn dim, its inverse caret after it, is not empty (RECONSTRUCTED)', () => {
    expect(promptIsEmpty('claude', styledFixture('claude-prompt-dim-draft-reconstructed.ansi'), null)).toBe(false);
  });

  it('a Codex dim run with the cursor after it is not empty, and a cursor not read is not empty (RECONSTRUCTED)', () => {
    const screen = styledFixture('codex-prompt-dim-run-reconstructed.ansi');
    expect(promptIsEmpty('codex', screen, { x: 13, y: 9 })).toBe(false);
    expect(promptIsEmpty('codex', screen, null)).toBe(false);
  });

  it('Codex reads its caret from tmux: on another row or another column is not empty', () => {
    const empty = styledFixture('codex-prompt-empty-0.160.0.ansi');
    expect(promptIsEmpty('codex', empty, { x: 2, y: 9 })).toBe(true);
    expect(promptIsEmpty('codex', empty, { x: 3, y: 9 })).toBe(false);
    expect(promptIsEmpty('codex', empty, { x: 2, y: 8 })).toBe(false);
    expect(promptIsEmpty('codex', empty, null)).toBe(false);
  });

  it('a Claude inverse cell anywhere but right after the glyph and its space is not empty', () => {
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[7m ${ESC}[0m`), null)).toBe(true);
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP} ${ESC}[7m ${ESC}[0m`), null)).toBe(false);
    expect(promptIsEmpty('claude', claudeScreen(`❯${ESC}[7m ${ESC}[0m`), null)).toBe(false);
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[2mdraft${ESC}[22m${ESC}[7m ${ESC}[0m`), null)).toBe(
      false
    );
    // An inverse letter at the caret is typed, not a cursor over a placeholder.
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[7mh${ESC}[0m`), null)).toBe(false);
  });

  it('no composer row, or more than one, is not empty', () => {
    expect(promptIsEmpty('claude', '', null)).toBe(false);
    expect(promptIsEmpty('claude', 'just a shell prompt $', null)).toBe(false);
    const two = [claudeScreen(`❯${NBSP}`), claudeScreen(`❯${NBSP}`)].join('\n');
    expect(promptIsEmpty('claude', two, null)).toBe(false);
    expect(promptIsEmpty('codex', 'nothing here', { x: 2, y: 0 })).toBe(false);
  });

  it('a rule that is not ten or more box characters is no rule', () => {
    const short = ['', `${'─'.repeat(9)}`, `❯${NBSP}`, `${'─'.repeat(9)}`].join('\n');
    expect(promptIsEmpty('claude', short, null)).toBe(false);
    const labelled = ['', `──── auto ${'─'.repeat(20)}`, `❯${NBSP}`, '─'.repeat(30)].join('\n');
    expect(promptIsEmpty('claude', labelled, null)).toBe(false);
  });

  it('an escape this reader does not know makes its row unreadable, which is not empty', () => {
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[K`), null)).toBe(false);
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}(B`), null)).toBe(false);
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${String.fromCharCode(0x09)}`), null)).toBe(false);
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[38;9m`), null)).toBe(false);
  });

  it('a hyperlink draws no cell and is skipped', () => {
    const osc = `${ESC}]8;;https://example.com${ESC}\\`;
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${osc}${osc}`), null)).toBe(true);
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${osc}x${osc}`), null)).toBe(false);
  });
});

describe('placeholder and typed text', () => {
  it('dim, bright black and the 240 to 250 grey band are placeholder; any other colour is typed', () => {
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[2mTry "fix lint"${ESC}[22m`), null)).toBe(true);
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[90mTry${ESC}[39m`), null)).toBe(true);
    for (const n of [240, 245, 250]) {
      expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[38;5;${String(n)}mTry${ESC}[39m`), null), String(n)).toBe(true);
      expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[38:5:${String(n)}mTry${ESC}[39m`), null), String(n)).toBe(true);
    }
    for (const sgr of ['38;5;239', '38;5;251', '38;5;6', '38;2;128;128;128', '37', '97', '1']) {
      expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[${sgr}mTry${ESC}[0m`), null), sgr).toBe(false);
    }
  });

  it('reset, normal intensity and default colour end a placeholder run', () => {
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[2mTry${ESC}[0mx`), null)).toBe(false);
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[2mTry${ESC}[22mx`), null)).toBe(false);
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[90mTry${ESC}[39mx`), null)).toBe(false);
    expect(promptIsEmpty('claude', claudeScreen(`❯${NBSP}${ESC}[2mTry${ESC}[mx`), null)).toBe(false);
  });

  it('the pen is carried across rows, as tmux prints it', () => {
    // The real rule row leaves 244 set and the prompt row resets it with 39.
    const carried = ['', RULE, `❯${NBSP}x`, RULE].join('\n');
    expect(promptIsEmpty('claude', carried, null)).toBe(true);
    const reset = ['', RULE, `${ESC}[39m❯${NBSP}x`, RULE].join('\n');
    expect(promptIsEmpty('claude', reset, null)).toBe(false);
  });

  it('a Codex draft\'s later lines under the composer are typed, wherever the cursor is', () => {
    expect(promptIsEmpty('codex', codexScreen(`${ESC}[2mAsk Codex${ESC}[0m`), { x: 2, y: 2 })).toBe(true);
    expect(promptIsEmpty('codex', codexScreen('', ['  second line']), { x: 2, y: 2 })).toBe(false);
    expect(promptIsEmpty('codex', codexScreen('typed'), { x: 2, y: 2 })).toBe(false);
  });

  it('a Codex option row is not the composer', () => {
    const screen = ['', `${ESC}[1m›${ESC}[0m 1. Yes, proceed (y)`, '  2. No', ''].join('\n');
    expect(promptIsEmpty('codex', screen, { x: 2, y: 1 })).toBe(false);
    // An empty composer above a list whose selected row starts with the same glyph:
    // the composer is the row that is not an option.
    const above = [`${ESC}[1m›${ESC}[0m ${ESC}[2mAsk Codex${ESC}[0m`, '', `${ESC}[1m›${ESC}[0m 1. Something`, '  2. Else'].join('\n');
    expect(promptIsEmpty('codex', above, { x: 2, y: 0 })).toBe(true);
  });

  it('an agent that is neither reads not empty', () => {
    expect(promptIsEmpty('shell' as 'claude', claudeScreen(`❯${NBSP}`), null)).toBe(false);
  });
});
