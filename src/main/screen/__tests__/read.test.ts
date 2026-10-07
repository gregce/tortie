/**
 * One read of a session's screen on this Mac (Phase 337, build/p337/SPEC.md
 * §5.3.3, D5 to D7; widened by Phase 337.1, build/p3371/SPEC.md D4, D5, §7.2):
 * the display line parsed whole and bounded, tab or `_`, its eighth field the
 * history size of at most nine digits; the three one-command lines written
 * over the control client in ONE statement, in order, aimed at the `$`-id; two
 * displays that disagree on any of the five fields `agree` compares read once
 * more, then the second's values, `steady` only when they agree; and the
 * control client down, ONE spawned list split by count, a captured row shaped
 * like a display just a row. And the page round's split (D9), by count from
 * its first display.
 */

import { describe, expect, it } from 'vitest';
import {
  agree,
  pageLineCount,
  parseScreenDisplay,
  readScreenLocal,
  SCREEN_FORMAT,
  spawnedReadArgs,
  splitScrollbackRead,
  splitSpawnedRead,
  type ScreenCore,
  type ScreenDisplay
} from '../read';

const ESC = String.fromCharCode(0x1b);

const LINE = (pane = '%3', cols = 120, rows = 3, alt = 0, history = 0): string =>
  [pane, String(cols), String(rows), '2', '1', '1', String(alt), String(history)].join('\t');

/** A control client that answers each command from a script, and records every line and when it was written. */
function scriptedControl(answers: ((command: string) => string[] | Error)[], connected = true) {
  const written: string[] = [];
  let tick = 0;
  const ticks: number[] = [];
  queueMicrotask(function bump() {
    tick += 1;
  });
  const control = {
    connected,
    sendCommand(command: string): Promise<string[]> {
      written.push(command);
      ticks.push(tick);
      const answer = answers.shift();
      if (answer === undefined) return Promise.reject(new Error('no answer scripted'));
      const value = answer(command);
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
    }
  };
  return { control, written, ticks };
}

function coreWith(control: ScreenCore['control']): ScreenCore {
  return {
    listSessions: () => [],
    tmuxIdOf: () => '$7',
    manifest: { getSession: () => undefined },
    control,
    activity: { noteUserInput: () => undefined }
  };
}

describe('SCREEN_FORMAT and parseScreenDisplay', () => {
  it('the one format names the eight fields, tab separated, the history size LAST (D4)', () => {
    expect(SCREEN_FORMAT).toBe(
      '#{pane_id}\t#{pane_width}\t#{pane_height}\t#{cursor_x}\t#{cursor_y}\t#{cursor_flag}\t#{alternate_on}\t#{history_size}'
    );
  });

  it('parses a tab-separated line, and the same line as a client tmux does not call UTF-8 prints it', () => {
    const want = {
      paneId: '%3',
      cols: 120,
      rows: 40,
      cursorX: 2,
      cursorY: 29,
      cursorVisible: false,
      alternate: true,
      history: 2961
    };
    expect(parseScreenDisplay('%3\t120\t40\t2\t29\t0\t1\t2961')).toEqual(want);
    expect(parseScreenDisplay('%3_120_40_2_29_0_1_2961')).toEqual(want);
    expect(parseScreenDisplay('%3\t120\t40\t2\t29\t0\t1\t2961\n')).toEqual(want);
  });

  it('refuses anything that is not eight whole, bounded fields', () => {
    for (const line of [
      '',
      // Phase 337's seven fields: the history size is missing.
      '%3\t120\t40\t2\t29\t0\t1',
      '%3\t120\t40\t2\t29\t0\t1\t0\t9',
      '$3\t120\t40\t2\t29\t0\t1\t0',
      '%3\t0\t40\t2\t29\t0\t1\t0',
      '%3\t120\t0\t2\t29\t0\t1\t0',
      '%3\t120\t40\t-2\t29\t0\t1\t0',
      '%3\t120\t40\t2\t29\t2\t1\t0',
      '%3\t120\t40\t2\t29\t0\tx\t0',
      '%3\t0120\t40\t2\t29\t0\t1\t0',
      '%3\t123456\t40\t2\t29\t0\t1\t0',
      '%3\t120_40\t2\t29\t0\t1\t1\t0',
      '%3 120 40 2 29 0 1 0',
      'P337 %end 1 1 1',
      // The history size: whole, no sign, no leading zero, at most nine digits.
      '%3\t120\t40\t2\t29\t0\t1\t',
      '%3\t120\t40\t2\t29\t0\t1\t-1',
      '%3\t120\t40\t2\t29\t0\t1\t01',
      '%3\t120\t40\t2\t29\t0\t1\t1.5',
      '%3\t120\t40\t2\t29\t0\t1\t1e3',
      '%3\t120\t40\t2\t29\t0\t1\t+5',
      '%3\t120\t40\t2\t29\t0\t1\t1234567890'
    ]) {
      expect(parseScreenDisplay(line), JSON.stringify(line)).toBeNull();
    }
  });

  it('a history of seven to nine digits is read, so a far server deeper than this Mac’s limit keeps its terminal (§Attack B16)', () => {
    for (const history of ['0', '1', '25000', '100000', '1000000', '9999999', '12345678', '999999999']) {
      expect(parseScreenDisplay(`%3\t120\t40\t2\t29\t0\t0\t${history}`)?.history, history).toBe(Number(history));
    }
    expect(parseScreenDisplay('%3\t120\t40\t2\t29\t0\t0\t1000000000')).toBeNull();
  });
});

describe('agree: the one comparison, over five fields (D5)', () => {
  const base: ScreenDisplay = {
    paneId: '%3',
    cols: 120,
    rows: 40,
    cursorX: 2,
    cursorY: 29,
    cursorVisible: true,
    alternate: false,
    history: 2961
  };

  it('agrees whatever the cursor did', () => {
    expect(agree(base, { ...base, cursorX: 9, cursorY: 0, cursorVisible: false })).toBe(true);
  });

  it('disagrees on each of the pane, the width, the height, the alternate screen and the history size', () => {
    for (const other of [
      { ...base, paneId: '%4' },
      { ...base, cols: 121 },
      { ...base, rows: 41 },
      { ...base, alternate: true },
      { ...base, history: 2962 }
    ]) {
      expect(agree(base, other), JSON.stringify(other)).toBe(false);
      expect(agree(other, base), JSON.stringify(other)).toBe(false);
    }
  });
});

describe('readScreenLocal over the control client', () => {
  it('writes display, capture, display, one command a line, aimed at the $-id, all three in one tick', async () => {
    const capture = [`${ESC}[31mred`, 'two', ''];
    const { control, written, ticks } = scriptedControl([() => [LINE()], () => capture, () => [LINE()]]);
    const reading = await readScreenLocal(coreWith(control), '$7');
    expect(written).toEqual([
      `display-message -p -t $7 '${SCREEN_FORMAT}'`,
      'capture-pane -p -e -t $7',
      `display-message -p -t $7 '${SCREEN_FORMAT}'`
    ]);
    // Written before any microtask ran: in one statement, not one await apart.
    expect(new Set(ticks).size).toBe(1);
    expect(reading).toEqual({
      styled: capture.join('\n'),
      display: parseScreenDisplay(LINE()),
      displayLine: LINE(),
      steady: true
    });
  });

  it('two displays that disagree are read once more; a second disagreement serves the second’s values', async () => {
    const { control, written } = scriptedControl([
      () => [LINE('%3', 120)],
      () => ['first'],
      () => [LINE('%3', 100)],
      () => [LINE('%3', 100)],
      () => ['second'],
      () => [LINE('%4', 100)]
    ]);
    const reading = await readScreenLocal(coreWith(control), '$7');
    expect(written).toHaveLength(6);
    expect(reading?.styled).toBe('second');
    expect(reading?.display.paneId).toBe('%4');
    // Served UNSTEADY (Phase 337.1 D5): the composer gives it no depth, and
    // its display line holds both lines, so its revision is never a steady
    // picture's of the same screen.
    expect(reading?.steady).toBe(false);
    expect(reading?.displayLine).toBe(`${LINE('%3', 100)}\n${LINE('%4', 100)}`);
  });

  it('displays that agree on pane, size, screen and history are read once, whatever the cursor did, and are steady', async () => {
    const moved = ['%3', '120', '3', '9', '2', '0', '0', '0'].join('\t');
    const { control, written } = scriptedControl([() => [LINE()], () => ['x'], () => [moved]]);
    const reading = await readScreenLocal(coreWith(control), '$7');
    expect(written).toHaveLength(3);
    expect(reading?.display.cursorX).toBe(9);
    expect(reading?.steady).toBe(true);
    expect(reading?.displayLine).toBe(moved);
  });

  it('a disagreement on the HISTORY alone is read twice, and a second one is served `steady: false` (Phase 337.1 D5)', async () => {
    // Lines scrolled during the read: the capture sits in neither display's
    // frame for certain (build/p3371/SPEC.md §14 M4).
    const { control, written } = scriptedControl([
      () => [LINE('%3', 120, 3, 0, 500)],
      () => ['x'],
      () => [LINE('%3', 120, 3, 0, 520)],
      () => [LINE('%3', 120, 3, 0, 540)],
      () => ['y'],
      () => [LINE('%3', 120, 3, 0, 561)]
    ]);
    const reading = await readScreenLocal(coreWith(control), '$7');
    expect(written).toHaveLength(6);
    expect(reading?.styled).toBe('y');
    expect(reading?.display.history).toBe(561);
    expect(reading?.steady).toBe(false);
  });

  it('a history disagreement the second read does not repeat is served steady, at the second read’s values', async () => {
    const { control, written } = scriptedControl([
      () => [LINE('%3', 120, 3, 0, 500)],
      () => ['x'],
      () => [LINE('%3', 120, 3, 0, 520)],
      () => [LINE('%3', 120, 3, 0, 520)],
      () => ['y'],
      () => [LINE('%3', 120, 3, 0, 520)]
    ]);
    const reading = await readScreenLocal(coreWith(control), '$7');
    expect(written).toHaveLength(6);
    expect(reading).toMatchObject({ styled: 'y', steady: true, displayLine: LINE('%3', 120, 3, 0, 520) });
  });

  it('never a third read: two disagreements are two attempts, six lines', async () => {
    const { control, written } = scriptedControl([
      () => [LINE('%3', 120, 3, 0, 1)],
      () => ['x'],
      () => [LINE('%3', 120, 3, 0, 2)],
      () => [LINE('%3', 120, 3, 0, 3)],
      () => ['y'],
      () => [LINE('%3', 120, 3, 0, 4)],
      () => [LINE('%3', 120, 3, 0, 4)],
      () => ['z'],
      () => [LINE('%3', 120, 3, 0, 4)]
    ]);
    const reading = await readScreenLocal(coreWith(control), '$7');
    expect(written).toHaveLength(6);
    expect(reading?.styled).toBe('y');
  });

  it('a disagreement on the PANE alone, size and screen the same, is read once more, and the keys aim at the second’s pane (D5)', async () => {
    // The fix round of 2026-10-06 (lens 1's ablation V14): taking the pane
    // clause out of `agree` left every gate green. Two displays one
    // statement apart can name different panes when the window's active pane
    // moved between them, and a capture taken between the two is of neither
    // for certain.
    const { control, written } = scriptedControl([
      () => [LINE('%3', 120, 3, 0)],
      () => ['x'],
      () => [LINE('%4', 120, 3, 0)],
      () => [LINE('%4', 120, 3, 0)],
      () => ['y'],
      () => [LINE('%4', 120, 3, 0)]
    ]);
    const reading = await readScreenLocal(coreWith(control), '$7');
    expect(written).toHaveLength(6);
    expect(reading?.styled).toBe('y');
    expect(reading?.display.paneId).toBe('%4');
    expect(reading?.steady).toBe(true);
  });

  it('a disagreement on the alternate screen is read once more', async () => {
    const { control, written } = scriptedControl([
      () => [LINE('%3', 120, 3, 0)],
      () => ['x'],
      () => [LINE('%3', 120, 3, 1)],
      () => [LINE('%3', 120, 3, 1)],
      () => ['y'],
      () => [LINE('%3', 120, 3, 1)]
    ]);
    expect((await readScreenLocal(coreWith(control), '$7'))?.styled).toBe('y');
    expect(written).toHaveLength(6);
  });

  it('null when any line is refused or a display is not one', async () => {
    const refused = scriptedControl([() => [LINE()], () => new Error('refused'), () => [LINE()]]);
    expect(await readScreenLocal(coreWith(refused.control), '$7')).toBeNull();
    const garbled = scriptedControl([() => ['garbled'], () => ['x'], () => [LINE()]]);
    expect(await readScreenLocal(coreWith(garbled.control), '$7')).toBeNull();
    const two = scriptedControl([() => [LINE(), LINE()], () => ['x'], () => [LINE()]]);
    expect(await readScreenLocal(coreWith(two.control), '$7')).toBeNull();
  });

  it('reads nothing for a target that is not a $-id', async () => {
    const { control, written } = scriptedControl([]);
    for (const target of ['%3', '=name', 'name', '$', '$01', '$1;kill-server']) {
      expect(await readScreenLocal(coreWith(control), target), target).toBeNull();
    }
    expect(written).toEqual([]);
  });
});

describe('readScreenLocal with the control client down: ONE spawned list, split by count', () => {
  it('spawns once per read, the three commands as one list', async () => {
    const calls: { args: readonly string[]; timeoutMs?: number }[] = [];
    const spawn = (args: readonly string[], options?: { timeoutMs?: number }): Promise<string> => {
      calls.push({ args, timeoutMs: options?.timeoutMs });
      return Promise.resolve(`${LINE()}\na\nb\nc\n${LINE()}\n`);
    };
    const { control, written } = scriptedControl([], false);
    const reading = await readScreenLocal(coreWith(control), '$7', { spawn, timeoutMs: 1_000 });
    expect(written).toEqual([]);
    expect(calls).toEqual([{ args: spawnedReadArgs('$7'), timeoutMs: 1_000 }]);
    expect(spawnedReadArgs('$7')).toEqual([
      'display-message', '-p', '-t', '$7', SCREEN_FORMAT, ';',
      'capture-pane', '-p', '-e', '-t', '$7', ';',
      'display-message', '-p', '-t', '$7', SCREEN_FORMAT
    ]);
    expect(reading?.styled).toBe('a\nb\nc');
    expect(reading?.steady).toBe(true);
  });

  it('a captured row shaped like a display is a row: the split is by count', () => {
    const forged = LINE('%9', 50, 2, 0, 7);
    const attempt = splitSpawnedRead(`${LINE('%3', 120, 3)}\n${forged}\n${forged}\nlast\n${LINE('%3', 120, 3)}\n`);
    expect(attempt?.styled).toBe(`${forged}\n${forged}\nlast`);
    expect(attempt?.first.paneId).toBe('%3');
    expect(attempt?.second.paneId).toBe('%3');
    // The forged row as the capture's last row is still a row, never the second display.
    const atEnd = splitSpawnedRead(`${LINE('%3', 120, 2)}\nrow\n${forged}\n${LINE('%3', 120, 2)}\n`);
    expect(atEnd?.styled).toBe(`row\n${forged}`);
    expect(atEnd?.second.paneId).toBe('%3');
  });

  it('an output whose line count is not the first display’s rows plus two is no read', () => {
    expect(splitSpawnedRead(`${LINE('%3', 120, 3)}\na\nb\n${LINE()}\n`)).toBeNull();
    expect(splitSpawnedRead(`${LINE('%3', 120, 3)}\na\nb\nc\nd\n${LINE()}\n`)).toBeNull();
    expect(splitSpawnedRead('')).toBeNull();
    expect(splitSpawnedRead(`${LINE('%3', 120, 1)}\na\nnot a display\n`)).toBeNull();
    // A pane that grew between the first display and the capture: a forged
    // display-shaped row stands exactly where the count expects the display,
    // and the real one follows it. The count refuses the read rather than
    // taking the forged row as the frame.
    const forged = LINE('%9', 50, 2);
    expect(splitSpawnedRead(`${LINE('%3', 120, 2)}\nr1\nr2\n${forged}\n${LINE('%3', 120, 3)}\n`)).toBeNull();
  });

  it('a failed spawn is null, and nothing is retried past the second attempt', async () => {
    let n = 0;
    const spawn = (): Promise<string> => {
      n += 1;
      return Promise.reject(new Error('down'));
    };
    const { control } = scriptedControl([], false);
    expect(await readScreenLocal(coreWith(control), '$7', { spawn })).toBeNull();
    expect(n).toBe(1);
  });
});

describe('the page round’s split (Phase 337.1 D9): by count from its FIRST display', () => {
  it('pageLineCount is tmux’s own count: each end at history + n, an end above the oldest line at the oldest', () => {
    // 3,000 lines of history: -S -100 -E -1 is the last 100 lines.
    expect(pageLineCount(-100, -1, 3000)).toBe(100);
    // A start above the oldest line starts at the oldest (index 0).
    expect(pageLineCount(-228, -101, 200)).toBe(100);
    expect(pageLineCount(-99_999, -1, 2961)).toBe(2961);
    // Both ends above the oldest: tmux prints the oldest line alone.
    expect(pageLineCount(-500, -300, 100)).toBe(1);
  });

  it('splits the first display, exactly the counted capture lines, then the last display', () => {
    const first = LINE('%3', 120, 40, 0, 300);
    const rows = Array.from({ length: 100 }, (_, i) => `L${String(i + 101)}`);
    const round = splitScrollbackRead(`${first}\n${rows.join('\n')}\n${first}\n`, -328, -101);
    // a + h = -28: from the oldest line; b + h = 199: 200 lines.
    expect(round).toBeNull();
    const all = Array.from({ length: 200 }, (_, i) => `L${String(i + 1)}`);
    const whole = splitScrollbackRead(`${first}\n${all.join('\n')}\n${first}\n`, -328, -101);
    expect(whole?.rows).toEqual(all);
    expect(whole?.first.history).toBe(300);
    expect(whole?.last.history).toBe(300);
  });

  it('a captured row shaped like a display is a row, wherever it stands', () => {
    const first = LINE('%3', 120, 40, 0, 10);
    const forged = LINE('%9', 50, 2, 0, 7);
    // -S -12 -E -9 over a history of 10: lines 0 to 1 (2 lines).
    const round = splitScrollbackRead(`${first}\n${forged}\n${forged}\n${first}\n`, -12, -9);
    expect(round?.rows).toEqual([forged, forged]);
    expect(round?.last.paneId).toBe('%3');
  });

  it('any other count, a first line that is not a display, or a last that is not, is no round', () => {
    const first = LINE('%3', 120, 40, 0, 10);
    expect(splitScrollbackRead(`${first}\na\n${first}\n`, -12, -9)).toBeNull();
    expect(splitScrollbackRead(`${first}\na\nb\nc\n${first}\n`, -12, -9)).toBeNull();
    expect(splitScrollbackRead(`not a display\na\nb\n${first}\n`, -12, -9)).toBeNull();
    expect(splitScrollbackRead(`${first}\na\nb\nnot a display\n`, -12, -9)).toBeNull();
    expect(splitScrollbackRead('', -12, -9)).toBeNull();
    // Exactly count + 2 lines, never more (Lens 1's ablation K13, the fix round):
    // a well-formed round with one more line after its last display is no round.
    expect(splitScrollbackRead(`${first}\na\nb\n${first}\n`, -12, -9)?.rows).toEqual(['a', 'b']);
    expect(splitScrollbackRead(`${first}\na\nb\n${first}\nextra\n`, -12, -9)).toBeNull();
    expect(splitScrollbackRead(`${first}\na\nb\n${first}\n${first}\n`, -12, -9)).toBeNull();
  });

  it('counts by the FIRST display: a last display with another history still splits, and the reader asks agree itself', () => {
    const first = LINE('%3', 120, 40, 0, 10);
    const later = LINE('%3', 120, 40, 0, 11);
    const round = splitScrollbackRead(`${first}\na\nb\n${later}\n`, -12, -9);
    expect(round?.rows).toEqual(['a', 'b']);
    expect(round === null ? true : agree(round.first, round.last)).toBe(false);
  });
});
