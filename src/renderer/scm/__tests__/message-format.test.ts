/**
 * Round-1 formatter units: the markdown-lite block parser behind the commit
 * hover card, and the long relative/absolute date helpers.
 */

import { describe, expect, it } from 'vitest';
import { parseMessageBlocks } from '../message-format';
import { formatRelativeLong, fullMessage } from '../format';

describe('parseMessageBlocks', () => {
  it('returns nothing for an empty body', () => {
    expect(parseMessageBlocks('')).toEqual([]);
  });

  it('splits paragraphs on blank lines', () => {
    const blocks = parseMessageBlocks('first line\nsecond line\n\nnext para');
    expect(blocks).toEqual([
      { kind: 'paragraph', text: 'first line\nsecond line' },
      { kind: 'paragraph', text: 'next para' }
    ]);
  });

  it('groups -, *, and • lines into one bullet list', () => {
    const blocks = parseMessageBlocks('- one\n* two\n• three');
    expect(blocks).toEqual([
      { kind: 'bullets', items: ['one', 'two', 'three'] }
    ]);
  });

  it('folds wrapped continuation lines into the previous bullet', () => {
    const blocks = parseMessageBlocks('- a bullet that\n  wraps onto more\n');
    expect(blocks).toEqual([
      { kind: 'bullets', items: ['a bullet that wraps onto more'] }
    ]);
  });

  it('keeps paragraphs and bullets in document order', () => {
    const blocks = parseMessageBlocks('intro\n\n- x\n- y\n\noutro');
    expect(blocks.map((b) => b.kind)).toEqual([
      'paragraph',
      'bullets',
      'paragraph'
    ]);
  });
});

describe('fullMessage', () => {
  it('joins subject and body with a blank line', () => {
    expect(fullMessage('subject', 'body text\n')).toBe('subject\n\nbody text');
  });

  it('is just the subject when the body is empty', () => {
    expect(fullMessage('subject', '')).toBe('subject');
    expect(fullMessage('subject', '  \n')).toBe('subject');
  });
});

describe('formatRelativeLong', () => {
  const MIN = 60_000;
  it('covers the unit ladder with singular/plural forms', () => {
    const now = Date.now();
    expect(formatRelativeLong(now, now)).toBe('just now');
    expect(formatRelativeLong(now - MIN, now)).toBe('1 minute ago');
    expect(formatRelativeLong(now - 5 * MIN, now)).toBe('5 minutes ago');
    expect(formatRelativeLong(now - 60 * MIN, now)).toBe('1 hour ago');
    expect(formatRelativeLong(now - 48 * 60 * MIN, now)).toBe('2 days ago');
    expect(formatRelativeLong(now - 14 * 24 * 60 * MIN, now)).toBe(
      '2 weeks ago'
    );
    expect(formatRelativeLong(now - 400 * 24 * 60 * MIN, now)).toBe(
      '1 year ago'
    );
  });
});
