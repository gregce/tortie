/**
 * THE CANNED SCREEN (Phase 337, build/p337/SPEC.md D39, §7.4, §11): the ONE
 * writer of build/fixtures/screen/sample-claude-2.1.287.json, and the test that
 * holds it equal, byte for byte, to what the SHIPPING composer makes of the
 * committed real capture build/fixtures/reply/claude-prompt-after-decline-
 * 2.1.287.ansi under a fixed display (real-captures.json's own: 120x40, the
 * cursor at 2,29 and hidden, no alternate screen).
 *
 * `P337_WRITE_SAMPLE=1` writes the file; otherwise this test only reads it and
 * fails on any difference, so the file can never drift from the composer.
 * See a Sample (Phase 333.3) answers the Screen read from it, and the phone's
 * `ScreenDecodeTests` decode it.
 *
 * The file is ASCII: every character past U+007F is written as a JSON `\u`
 * escape, so no raw no-break space or box character stands in it.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { PocketScreenAnswer } from '@shared/ipc/pocket';
import { REPO, realCaptures, styledFixture } from '../../reply/__tests__/fixtures';
import { composeScreen } from '../compose';
import { parseScreenDisplay, type ScreenReading } from '../read';
import { readingRevisionOf } from '../watch';

const SOURCE = 'claude-prompt-after-decline-2.1.287.ansi';
const SAMPLE = join(REPO, 'build', 'fixtures', 'screen', 'sample-claude-2.1.287.json');
const SESSION_ID = 'sample-claude';
const TURN = '0000000000000000-0';
/** A fixed time, so the file does not move by the clock: 2026-10-05T00:00:00Z. */
const AT = 1_791_158_400_000;

/** The sample answer, composed by the shipping composer. */
function sampleAnswer(): PocketScreenAnswer {
  const truth = realCaptures().find((c) => c.files[0] === SOURCE);
  if (truth === undefined) throw new Error(`${SOURCE} is not in real-captures.json`);
  const displayLine = ['%0', '120', '40', String(truth.cursor.x), String(truth.cursor.y), truth.cursor.visible ? '1' : '0', '0'].join('\t');
  const display = parseScreenDisplay(displayLine);
  if (display === null) throw new Error('the fixed display does not parse');
  const reading: ScreenReading = { styled: styledFixture(SOURCE), display, displayLine };
  const composed = composeScreen(reading, { turn: TURN, status: 'idle', typable: true });
  if (composed === 'large') throw new Error('the sample is large');
  return {
    sessionId: SESSION_ID,
    revision: readingRevisionOf(SESSION_ID, reading, TURN, false, true),
    at: AT,
    unchanged: false,
    screen: composed.screen,
    why: null,
    sentence: null
  };
}

/** The file's bytes: two-space JSON, every character past U+007F escaped, one newline at the end. */
function sampleText(answer: PocketScreenAnswer): string {
  return `${JSON.stringify(answer, null, 2).replace(/[\u0080-￿]/g, (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}`)}\n`;
}

describe('build/fixtures/screen/sample-claude-2.1.287.json', () => {
  it('is the shipping composer’s answer for the committed capture, byte for byte', () => {
    const text = sampleText(sampleAnswer());
    if (process.env.P337_WRITE_SAMPLE === '1') writeFileSync(SAMPLE, text);
    expect(readFileSync(SAMPLE, 'utf8')).toBe(text);
  });

  it('is ASCII, decodes to the same answer, and draws the capture’s prompt', () => {
    const bytes = readFileSync(SAMPLE);
    expect([...bytes].every((b) => b >= 0x20 ? b < 0x7f : b === 0x0a)).toBe(true);
    const answer = JSON.parse(bytes.toString('utf8')) as PocketScreenAnswer;
    expect(answer).toEqual(sampleAnswer());
    expect(answer.revision).toMatch(/^[0-9a-f]{12}$/);
    expect(answer.screen?.lines).toHaveLength(40);
    expect(answer.screen?.cursor).toEqual({ x: 2, y: 29, visible: false });
    const rows = (answer.screen?.lines ?? []).map((runs) => runs.map((r) => r.text).join(''));
    expect(rows[29]?.startsWith(`${String.fromCodePoint(0x276f)}${String.fromCharCode(0xa0)}`)).toBe(true);
    expect(answer.screen?.asking).toBe(false);
    expect(answer.screen?.dialog).toBeNull();
    for (const runs of answer.screen?.lines ?? []) {
      expect(runs.reduce((n, r) => n + r.cells, 0)).toBeLessThanOrEqual(120);
    }
  });
});
