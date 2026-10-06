/**
 * One read of a session's screen on this Mac (Phase 337, build/p337/SPEC.md
 * §5.3.3, D5 to D7): the display line parsed whole and bounded, tab or `_`;
 * the three one-command lines written over the control client in ONE
 * statement, in order, aimed at the `$`-id; two displays that disagree read
 * once more, then the second's values; and the control client down, ONE
 * spawned list split by count, a captured row shaped like a display just a row.
 */

import { describe, expect, it } from 'vitest';
import {
  parseScreenDisplay,
  readScreenLocal,
  SCREEN_FORMAT,
  spawnedReadArgs,
  splitSpawnedRead,
  type ScreenCore
} from '../read';

const ESC = String.fromCharCode(0x1b);

const LINE = (pane = '%3', cols = 120, rows = 3, alt = 0): string =>
  [pane, String(cols), String(rows), '2', '1', '1', String(alt)].join('\t');

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
  it('the one format names the seven fields, tab separated', () => {
    expect(SCREEN_FORMAT).toBe(
      '#{pane_id}\t#{pane_width}\t#{pane_height}\t#{cursor_x}\t#{cursor_y}\t#{cursor_flag}\t#{alternate_on}'
    );
  });

  it('parses a tab-separated line, and the same line as a client tmux does not call UTF-8 prints it', () => {
    const want = { paneId: '%3', cols: 120, rows: 40, cursorX: 2, cursorY: 29, cursorVisible: false, alternate: true };
    expect(parseScreenDisplay('%3\t120\t40\t2\t29\t0\t1')).toEqual(want);
    expect(parseScreenDisplay('%3_120_40_2_29_0_1')).toEqual(want);
    expect(parseScreenDisplay('%3\t120\t40\t2\t29\t0\t1\n')).toEqual(want);
  });

  it('refuses anything that is not seven whole, bounded fields', () => {
    for (const line of [
      '',
      '%3\t120\t40\t2\t29\t0',
      '%3\t120\t40\t2\t29\t0\t1\t9',
      '$3\t120\t40\t2\t29\t0\t1',
      '%3\t0\t40\t2\t29\t0\t1',
      '%3\t120\t0\t2\t29\t0\t1',
      '%3\t120\t40\t-2\t29\t0\t1',
      '%3\t120\t40\t2\t29\t2\t1',
      '%3\t120\t40\t2\t29\t0\tx',
      '%3\t0120\t40\t2\t29\t0\t1',
      '%3\t123456\t40\t2\t29\t0\t1',
      '%3\t120_40\t2\t29\t0\t1\t1',
      '%3 120 40 2 29 0 1',
      'P337 %end 1 1 1'
    ]) {
      expect(parseScreenDisplay(line), JSON.stringify(line)).toBeNull();
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
    expect(reading).toEqual({ styled: capture.join('\n'), display: parseScreenDisplay(LINE()), displayLine: LINE() });
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
    expect(reading?.displayLine).toBe(LINE('%4', 100));
  });

  it('displays that agree on pane, size and screen are read once, whatever the cursor did', async () => {
    const moved = ['%3', '120', '3', '9', '2', '0', '0'].join('\t');
    const { control, written } = scriptedControl([() => [LINE()], () => ['x'], () => [moved]]);
    const reading = await readScreenLocal(coreWith(control), '$7');
    expect(written).toHaveLength(3);
    expect(reading?.display.cursorX).toBe(9);
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
  });

  it('a captured row shaped like a display is a row: the split is by count', () => {
    const forged = LINE('%9', 50, 2);
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
