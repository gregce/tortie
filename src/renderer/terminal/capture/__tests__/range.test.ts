import { describe, expect, it } from 'vitest';
import {
  historyLinesFor,
  paneLines,
  selectionBand
} from '../range';

const ESC = '\u001b';

describe('selectionBand', () => {
  it('maps absolute buffer rows onto the viewport', () => {
    // viewportY 377, selection on buffer rows 396–398 → viewport rows 19–21.
    const band = selectionBand(
      { start: { y: 396 }, end: { y: 398 } },
      377,
      24
    );
    expect(band).toEqual({ topRow: 19, rowCount: 3, onScreen: true });
  });

  it('is off screen when the selection starts above the viewport', () => {
    const band = selectionBand({ start: { y: 10 }, end: { y: 12 } }, 20, 24);
    expect(band.topRow).toBe(-10);
    expect(band.onScreen).toBe(false);
  });

  it('is off screen when the selection runs past the last row', () => {
    const band = selectionBand({ start: { y: 20 }, end: { y: 50 } }, 20, 24);
    expect(band.onScreen).toBe(false);
    expect(band.rowCount).toBe(31);
  });

  it('counts a single-row selection as one row', () => {
    expect(selectionBand({ start: { y: 5 }, end: { y: 5 } }, 0, 24)).toEqual({
      topRow: 5,
      rowCount: 1,
      onScreen: true
    });
  });
});

describe('historyLinesFor', () => {
  it('subtracts the visible screen, which the capture already includes', () => {
    expect(historyLinesFor(250, 40)).toBe(210);
    expect(historyLinesFor(1000, 24)).toBe(976);
  });

  it('never asks for negative history', () => {
    expect(historyLinesFor(10, 40)).toBe(0);
  });
});

describe('paneLines', () => {
  it('drops the trailing blank rows tmux leaves behind', () => {
    expect(paneLines('one\ntwo\n\n\n', 100)).toEqual(['one', 'two']);
  });

  it('sees through SGR escapes when judging a row blank', () => {
    const ansi = `hello\n${ESC}[0m   ${ESC}[m\n`;
    expect(paneLines(ansi, 100)).toEqual(['hello']);
  });

  it('keeps colored content', () => {
    const ansi = `${ESC}[32mgreen${ESC}[0m\n`;
    expect(paneLines(ansi, 100)).toEqual([`${ESC}[32mgreen${ESC}[0m`]);
  });

  it('caps to the last maxLines rows', () => {
    const ansi = Array.from({ length: 10 }, (_, i) => `l${i}`).join('\n');
    expect(paneLines(ansi, 3)).toEqual(['l7', 'l8', 'l9']);
  });
});
