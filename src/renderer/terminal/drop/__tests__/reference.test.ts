import { describe, expect, it } from 'vitest';
import {
  backslashEscape,
  isUnsafeToPaste,
  posixQuote,
  referenceText
} from '../reference';

describe('referenceText', () => {
  it('sends a plain path untouched to an agent pane', () => {
    expect(referenceText('/Users/x/shot.png', 'claude')).toBe(
      '/Users/x/shot.png'
    );
  });

  it('backslash-escapes spaces for agent panes (the codex regression)', () => {
    expect(referenceText('/Users/x/test image.png', 'codex')).toBe(
      '/Users/x/test\\ image.png'
    );
  });

  it('escapes quotes and backslashes too', () => {
    expect(referenceText(`/tmp/it's "a" \\path.png`, 'claude')).toBe(
      `/tmp/it\\'s\\ \\"a\\"\\ \\\\path.png`
    );
  });

  it('POSIX-quotes for a shell pane', () => {
    expect(referenceText('/tmp/a b.png', 'shell')).toBe("'/tmp/a b.png'");
    expect(referenceText("/tmp/it's.png", 'shell')).toBe(
      "'/tmp/it'\\''s.png'"
    );
  });

  it('leaves unicode and emoji alone', () => {
    expect(referenceText('/tmp/图片🎉.png', 'claude')).toBe('/tmp/图片🎉.png');
  });
});

describe('quoting helpers', () => {
  it('backslashEscape only touches whitespace, quotes and backslashes', () => {
    expect(backslashEscape('/tmp/a-b_c.1.png')).toBe('/tmp/a-b_c.1.png');
    expect(backslashEscape('a\tb')).toBe('a\\\tb');
  });

  it('posixQuote survives a round trip through a shell', () => {
    expect(posixQuote("a'b")).toBe("'a'\\''b'");
  });
});

describe('isUnsafeToPaste', () => {
  it('rejects only newline-bearing paths', () => {
    expect(isUnsafeToPaste('/tmp/ok.png')).toBe(false);
    expect(isUnsafeToPaste('/tmp/bad\nname.png')).toBe(true);
  });
});
