/**
 * Phase 320.1's fix round: a machine's scroll read survives a control client
 * with no UTF-8 locale, and fails CLOSED when it cannot be read.
 *
 * WHAT WAS WRONG, measured by the attack verifier on 2026-09-30 over the
 * loopback machine (its sshd forwards no LANG), tmux 3.6a and 3.7b alike. tmux
 * hands a format's answer to a client it does not classify as UTF-8 through
 * `utf8_sanitize`, which turns every byte below 0x20 into `_`. The read used
 * this Mac's tab-separated `STATE_FORMAT`, so it came back as
 * `0__1971_30_0_0_100_`, and the reader, which turns anything it cannot read
 * into zeros, answered "live, no history" while the far pane sat parked 10
 * lines back in copy mode. Keys typed next went into copy mode: 115 of 330
 * characters lost in the typing rig, against 0 of 330 with a UTF-8 client.
 *
 * What this pins, against the SHIPPING scroll.ts:
 *
 *  - a runner that names a `server` reads with `REMOTE_STATE_FORMAT`, the same
 *    eight fields with a space between them, and every byte of it printable
 *    ASCII; this Mac's runner still reads with the tab format and its lenient
 *    reader, byte for byte;
 *  - a machine's answer is read to the same state this Mac's reader makes of
 *    the same fields;
 *  - a machine's answer that is not exactly one line of eight whole-number
 *    fields THROWS `UnreadableScrollAnswer`, on the read alone and at the end
 *    of every pipelined sequence, and never answers "live";
 *  - the error names how many fields it found and no byte of what they said.
 */

import { describe, expect, it } from 'vitest';
import {
  REMOTE_STATE_FORMAT,
  STATE_FORMAT,
  exitPaneScroll,
  isUnreadableScrollAnswer,
  readPaneScroll,
  scrollPaneBy,
  scrollPaneTo,
  type PaneScrollState,
  type TmuxScrollRunner
} from '../scroll';

/** A parked pane: 10 back over 1971 lines, 30 rows, 100 columns, frame 1971. */
const FIELDS = ['1', '10', '1971', '30', '0', '0', '100', '1971'];

/** What a machine's control client with no UTF-8 locale answered for the tab format. */
const SANITIZED = '0__1971_30_0_0_100_';

/** A runner answering every read with `answer`, as a machine's (`server`) or this Mac's. */
function runner(kind: 'machine' | 'here', answer: string): { run: TmuxScrollRunner; reads: string[] } {
  const reads: string[] = [];
  const fn = (args: readonly string[]): Promise<string> => {
    if (args[0] === 'display-message') reads.push(args[args.length - 1] ?? '');
    return Promise.resolve(args[0] === 'display-message' ? answer : '');
  };
  return {
    run: kind === 'machine' ? Object.assign(fn, { ordered: true, server: 'machine:far' }) : fn,
    reads
  };
}

async function thrown(op: Promise<PaneScrollState>): Promise<unknown> {
  return op.then(
    () => null,
    (err: unknown) => err
  );
}

describe('the read format a runner asks with', () => {
  it('a machine reads with REMOTE_STATE_FORMAT: the same eight fields, one space between, every byte printable ASCII', async () => {
    expect(REMOTE_STATE_FORMAT.split(' ')).toEqual(STATE_FORMAT.split('\t'));
    expect(REMOTE_STATE_FORMAT.split(' ')).toHaveLength(8);
    expect(/^[\x20-\x7e]+$/.test(REMOTE_STATE_FORMAT)).toBe(true);
    expect(REMOTE_STATE_FORMAT.includes('#(')).toBe(false);
    const there = runner('machine', FIELDS.join(' '));
    await readPaneScroll(there.run, '$3');
    await scrollPaneBy(there.run, '$3', 5);
    await scrollPaneBy(there.run, '$3', -5);
    await scrollPaneTo(there.run, '$3', 40);
    await exitPaneScroll(there.run, '$3');
    expect(there.reads.length).toBeGreaterThan(4);
    expect(there.reads.every((format) => format === REMOTE_STATE_FORMAT)).toBe(true);
  });

  it('this Mac still reads with the tab format, byte for byte', async () => {
    const here = runner('here', FIELDS.join('\t'));
    await readPaneScroll(here.run, '$3');
    await scrollPaneBy(here.run, '$3', 5);
    expect(here.reads.every((format) => format === STATE_FORMAT)).toBe(true);
    expect(STATE_FORMAT.split('\t')).toHaveLength(8);
  });
});

describe('a machine\'s answer is read strictly', () => {
  it('reads the same state this Mac reads from the same fields', async () => {
    const there = await readPaneScroll(runner('machine', FIELDS.join(' ')).run, '$3');
    const here = await readPaneScroll(runner('here', FIELDS.join('\t')).run, '$3');
    expect(there).toEqual(here);
    expect(there).toEqual({
      position: 10,
      history: 1971,
      rows: 30,
      cols: 100,
      frameHistory: 1971,
      inMode: true,
      innerAlt: false,
      innerMouse: false
    });
    // Outside copy mode, two fields are empty and the line ends in a space.
    const live = ['0', '', '1971', '30', '0', '0', '100', ''];
    expect(await readPaneScroll(runner('machine', `${live.join(' ')}\n`).run, '$3')).toEqual(
      await readPaneScroll(runner('here', live.join('\t')).run, '$3')
    );
  });

  it('the sanitized answer THROWS on the read alone, where this Mac\'s reader answers live with no history', async () => {
    const err = await thrown(readPaneScroll(runner('machine', SANITIZED).run, '$3'));
    expect(isUnreadableScrollAnswer(err)).toBe(true);
    // The lenient reader, for contrast, is the defect the verifier measured.
    expect(await readPaneScroll(runner('here', SANITIZED).run, '$3')).toMatchObject({
      inMode: false,
      position: 0,
      history: 0
    });
  });

  it('a parking sequence whose read cannot be read THROWS, and never comes back saying the pane is live', async () => {
    for (const [label, op] of [
      ['up 10', (run: TmuxScrollRunner) => scrollPaneBy(run, '$3', 10)],
      ['down 3', (run: TmuxScrollRunner) => scrollPaneBy(run, '$3', -3)],
      ['up 2500', (run: TmuxScrollRunner) => scrollPaneBy(run, '$3', 2500)],
      ['to 500', (run: TmuxScrollRunner) => scrollPaneTo(run, '$3', 500)],
      ['back to live', (run: TmuxScrollRunner) => exitPaneScroll(run, '$3')]
    ] as const) {
      const err = await thrown(op(runner('machine', SANITIZED).run));
      expect(isUnreadableScrollAnswer(err), label).toBe(true);
    }
  });

  it('refuses every answer that is not one line of eight whole-number fields', async () => {
    const bad = [
      '',
      '\n',
      FIELDS.join('\t'),
      FIELDS.slice(0, 7).join(' '),
      [...FIELDS, '1'].join(' '),
      `${FIELDS.join(' ')}\n${FIELDS.join(' ')}`,
      FIELDS.join('  '),
      ` ${FIELDS.join(' ')}`,
      ['x', ...FIELDS.slice(1)].join(' '),
      ['1', '-10', ...FIELDS.slice(2)].join(' '),
      ['1', '10', '1e3', ...FIELDS.slice(3)].join(' '),
      ['1', '10', '1971', '', ...FIELDS.slice(4)].join(' '),
      // The fix round (the attack verifier's x14): an EMPTY pane_in_mode is
      // not "not in a mode". It is the first field missing, and it is refused.
      ['', ...FIELDS.slice(1)].join(' '),
      ['', '', '1971', '30', '0', '0', '100', ''].join(' '),
      ['1', '10', '1971', '30', '0', '0', '100', '1.5'].join(' '),
      ['1', '10', '١٩٧١', ...FIELDS.slice(3)].join(' '),
      SANITIZED
    ];
    for (const answer of bad) {
      const err = await thrown(readPaneScroll(runner('machine', answer).run, '$3'));
      expect(isUnreadableScrollAnswer(err), JSON.stringify(answer)).toBe(true);
    }
  });

  it('the error names how many fields it found and no byte of what they said', async () => {
    const err = await thrown(readPaneScroll(runner('machine', 'secret far text').run, '$3'));
    expect(isUnreadableScrollAnswer(err)).toBe(true);
    const message = err instanceof Error ? err.message : '';
    expect(message.includes('secret')).toBe(false);
    expect(message.includes('3 field')).toBe(true);
  });
});
