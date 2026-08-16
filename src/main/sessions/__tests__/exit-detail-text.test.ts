/**
 * The last words of a dead pane, as text (Phase 48).
 *
 * The reaper needs a booted core, a live tmux server and a manifest. The
 * decision about WHICH bytes are kept does not, so it lives in
 * ../exit-detail and is pinned here on its own.
 */

import { describe, expect, it } from 'vitest';
import {
  EXIT_DETAIL_MAX_BYTES,
  exitDetailFrom
} from '../exit-detail';

describe('exitDetailFrom', () => {
  it('keeps the last five non-empty lines, newest last', () => {
    const text = ['one', 'two', 'three', 'four', 'five', 'six', 'seven'].join(
      '\n'
    );
    expect(exitDetailFrom(text)).toBe('three\nfour\nfive\nsix\nseven');
  });

  it('drops blank lines and trailing whitespace', () => {
    const text = 'error: unknown option \'--settings\'   \n\n\n';
    expect(exitDetailFrom(text)).toBe("error: unknown option '--settings'");
  });

  it('drops carriage returns rather than keeping them in the text', () => {
    expect(exitDetailFrom('node: bad option\r\n')).toBe('node: bad option');
  });

  it('strips ANSI, including the colon form of SGR and OSC titles', () => {
    const esc = '\u001b';
    const text =
      `${esc}[31mfatal:${esc}[0m nvm is not a function\n` +
      `${esc}[38:2:255:0:0mred${esc}[0m\n` +
      `${esc}]0;title\u0007tail\n`;
    expect(exitDetailFrom(text)).toBe('fatal: nvm is not a function\nred\ntail');
  });

  it('returns undefined when nothing is left', () => {
    expect(exitDetailFrom('')).toBeUndefined();
    expect(exitDetailFrom('\n\n   \n')).toBeUndefined();
  });

  it('drops whole lines from the front until the text fits 500 bytes', () => {
    const long = 'x'.repeat(200);
    const text = [long, long, long, 'the last line'].join('\n');
    const detail = exitDetailFrom(text);
    expect(detail).toBeDefined();
    if (detail === undefined) return;
    expect(Buffer.byteLength(detail, 'utf8')).toBeLessThanOrEqual(
      EXIT_DETAIL_MAX_BYTES
    );
    // Two 200 byte lines plus the newline plus the last line is 414 bytes, so
    // exactly one line comes off the front.
    expect(detail.split('\n').length).toBe(3);
    expect(detail.endsWith('the last line')).toBe(true);
  });

  it('keeps the last 500 bytes when one line alone is too long', () => {
    const detail = exitDetailFrom(`${'a'.repeat(600)}z`);
    expect(detail).toBeDefined();
    if (detail === undefined) return;
    expect(Buffer.byteLength(detail, 'utf8')).toBe(EXIT_DETAIL_MAX_BYTES);
    expect(detail.endsWith('z')).toBe(true);
  });

  it('never produces a replacement character when it cuts', () => {
    // Every character is three bytes, so a byte cut at 500 lands inside one.
    const detail = exitDetailFrom('あ'.repeat(400));
    expect(detail).toBeDefined();
    if (detail === undefined) return;
    expect(detail).not.toContain('�');
    expect(Buffer.byteLength(detail, 'utf8')).toBeLessThanOrEqual(
      EXIT_DETAIL_MAX_BYTES
    );
  });
});

/**
 * PHASE 48 FIX ROUND. tmux's own dead pane banner.
 *
 * The two literal banners below were captured on this machine from tmux 3.6a
 * running resources/gmux-tmux.conf, one from a process that exited 127 and one
 * from a process killed by SIGKILL. They are the default
 * `remain-on-exit-format`, which Tortie does not set and therefore inherits.
 */
describe('exitDetailFrom drops the line tmux wrote', () => {
  const exitBanner = 'Pane is dead (status 127, Sat Aug 15 21:11:05 2026)';
  const signalBanner = 'Pane is dead (signal kill, Sat Aug 15 21:11:50 2026)';

  it('keeps the message and drops the banner under it', () => {
    expect(exitDetailFrom(`env: node: No such file\n${exitBanner}\n`)).toBe(
      'env: node: No such file'
    );
    expect(exitDetailFrom(`alive\n${signalBanner}\n`)).toBe('alive');
  });

  it('gives the five lines back to the agent', () => {
    const text = ['one', 'two', 'three', 'four', 'five', exitBanner].join('\n');
    expect(exitDetailFrom(text)).toBe('one\ntwo\nthree\nfour\nfive');
  });

  /**
   * The measured shape of the discard. A 450 character message survived at
   * 490 bytes and a 451 character one was replaced by 49 bytes of banner,
   * because the join of the two exceeded the cap and the front-dropping loop
   * removed the message and stopped. Reproduced live with a real 4000
   * character pane line, which stored nothing but the banner.
   */
  it('no longer discards a long single line in favour of the banner', () => {
    const message = 'E'.repeat(451);
    const detail = exitDetailFrom(`${message}\n${exitBanner}\n`);
    expect(detail).toBe(message);
  });

  it('answers undefined when the banner was the only line', () => {
    expect(exitDetailFrom(`${exitBanner}\n`)).toBeUndefined();
    expect(exitDetailFrom(`\n\n\n${exitBanner}\n`)).toBeUndefined();
  });

  it('leaves a line the agent printed that merely mentions the words', () => {
    // Not the banner's shape, so it stays. The match is anchored at both ends.
    const said = 'warning: Pane is dead is a phrase this agent printed';
    expect(exitDetailFrom(`${said}\n`)).toBe(said);
  });

  it('drops one banner only, and only when it is last', () => {
    // A banner in the middle is not tmux's, because tmux writes one and writes
    // it last, so it is left exactly where it is.
    const text = [exitBanner, 'after', exitBanner].join('\n');
    expect(exitDetailFrom(text)).toBe(`${exitBanner}\nafter`);
  });
});
