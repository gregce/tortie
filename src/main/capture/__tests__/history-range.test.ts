/**
 * Phase 209's clamp, and Phase 295's instant: a copy from a session's history
 * is the lines that were selected.
 *
 * THE INSTANT (Phase 295). The renderer numbers lines from the oldest the
 * server holds and `capture-pane` numbers them from the top of the live screen,
 * so the conversion needs `#{history_size}` as it is WHEN the lines are taken.
 * This header used to say the service read it "at the instant of the capture".
 * It did not: it read it in one tmux call and captured in a second with offsets
 * it had computed in between, and every line a busy pane printed between the
 * two shifted the copy forward by a line. Measured on 2026-11-05 at 80 lines a
 * second on tmux 3.7b, 58 of 300 copies were off. Now one invocation reads the
 * extent and captures, and tmux computes the offsets itself.
 *
 * THE CLAMP (Phase 209). tmux moves a range above the top of the history to
 * the oldest line and answers ONE row for it, measured 2026-09-03 with 93
 * lines of history: `-S -1000 -E -999` printed the oldest line. A copy
 * composed from that row would be a line the person never selected. So the
 * service refuses a range that is gone and reports the line the first
 * returned row really is, and since Phase 295 it reads the extent the same
 * invocation printed to do so.
 *
 * THE RIG. A fake tmux server under the real modules: `execTmux` is the one
 * spawn every tmux call in this path makes (src/main/tmux/supervisor.ts), and
 * it is replaced here by a server whose grid holds `L0`, `L1`, ... and GAINS
 * `k` LINES ON EVERY SPAWN, before that spawn's commands run, so a busy pane is
 * a parameter. Everything above the spawn is the shipped code: the service,
 * `captureHistoryLines`, the clamp, and, for a build that still has them, the
 * two-call `readPaneExtent` and `capturePane`. The fake evaluates the argv the
 * way tmux 3.7b's `cmd-capture-pane.c` does (read in the vendored source):
 * `-S`/`-E` through format expansion, a value outside `INT_MIN..SHRT_MAX` or
 * not a number read as the top of the live screen (`-S`) or its last row
 * (`-E`), a negative offset past the history clamped to the oldest line, both
 * ends clamped to the last row, and the two swapped when they cross. So the
 * same file runs against the parent build, where the copy is `k` lines newer
 * than the selection and these rows go red, and against this one, where it is
 * exact.
 *
 * Every expected answer below is derived by hand from the grid, not read back
 * from the code: line `i` of the grid reads `L<i>`, the screen is the last
 * `rows` lines, and the history is everything above it.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

/** tmux's `SHRT_MAX`, the bound `capture-pane` reads `-S` and `-E` within. */
const SHRT_MAX = 32_767;
/** tmux's `INT_MIN`. */
const INT_MIN = -(2 ** 31);

/** The fake server's grid and what it was asked. */
const server = {
  /** Lines the grid holds, oldest first: `L0` to `L(lines - 1)`. */
  lines: 900,
  /** Rows on the screen. */
  rows: 43,
  /** Lines printed before every spawn's commands run. */
  perSpawn: 0,
  /** Every spawn's argv, in order. */
  spawns: [] as string[][]
};

function history(): number {
  return Math.max(0, server.lines - server.rows);
}

/** `#{history_size}` and `#{pane_height}` expanded, then `#{e|-:a,b}` evaluated. */
function expand(format: string): string {
  const plain = format
    .replace(/#\{history_size\}/g, String(history()))
    .replace(/#\{pane_height\}/g, String(server.rows));
  return plain.replace(/#\{e\|-:([^,{}]*),([^,{}]*)\}/g, (_m, a: string, b: string) => {
    const x = Number(a);
    const y = Number(b);
    // tmux's expression parser answers 0 for an operand it cannot read.
    return String((Number.isFinite(x) ? Math.trunc(x) : 0) - (Number.isFinite(y) ? Math.trunc(y) : 0));
  });
}

/** `args_strtonum_and_expand` over INT_MIN..SHRT_MAX: a number, or null for its `cause`. */
function strtonum(value: string | undefined): number | null {
  if (value === undefined) return null;
  const text = expand(value);
  if (!/^-?\d+$/.test(text)) return null;
  const n = Number(text);
  return n < INT_MIN || n > SHRT_MAX ? null : n;
}

function flag(args: readonly string[], name: string): string | undefined {
  const at = args.indexOf(name);
  return at === -1 ? undefined : args[at + 1];
}

/** `cmd_capture_pane_history`, the rows it prints, as read in 3.7b's source. */
function capture(args: readonly string[]): string {
  const hsize = history();
  const last = hsize + server.rows - 1;
  const s = strtonum(flag(args, '-S'));
  let top = s === null ? hsize : s < 0 && -s > hsize ? 0 : hsize + s;
  if (top > last) top = last;
  const e = strtonum(flag(args, '-E'));
  let bottom = e === null ? last : e < 0 && -e > hsize ? 0 : hsize + e;
  if (bottom > last) bottom = last;
  if (bottom < top) [top, bottom] = [bottom, top];
  let out = '';
  for (let i = top; i <= bottom; i += 1) out += `L${String(i)}\n`;
  return out;
}

/** One tmux client: the grid moves, then its `;`-separated commands run back to back. */
async function fakeExecTmux(args: readonly string[]): Promise<string> {
  server.spawns.push([...args]);
  server.lines += server.perSpawn;
  const commands: string[][] = [[]];
  for (const arg of args) {
    if (arg === ';') commands.push([]);
    else commands[commands.length - 1]?.push(arg);
  }
  let out = '';
  for (const command of commands) {
    if (flag(command, '-t') !== '$9') throw new Error(`can't find pane: ${String(flag(command, '-t'))}`);
    if (command[0] === 'display-message') out += `${expand(flag(command, '-F') ?? '')}\n`;
    else if (command[0] === 'capture-pane') out += capture(command);
    else throw new Error(`unknown command ${String(command[0])}`);
  }
  return out;
}

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
  clipboard: {},
  dialog: {},
  nativeImage: {}
}));
vi.mock('../../tmux/supervisor', () => ({
  execTmux: (args: readonly string[]) => fakeExecTmux(args)
}));
// The service reaches this Mac's tmux through the barrel for its target and
// its last-N capture, and, on a build that still has them, the two calls of
// the old range. Each is the shipped function from src/main/tmux/sessions.ts,
// over the fake spawn above.
vi.mock('../../tmux', async () => {
  const sessions = await vi.importActual<Record<string, unknown>>('../../tmux/sessions');
  return {
    resolvePaneTarget: sessions['resolvePaneTarget'],
    capturePane: sessions['capturePane'],
    readPaneExtent: sessions['readPaneExtent']
  };
});

const { capturePaneText } = await import('../service');

/** The rows a copy of lines `from` to `to` must hold, derived from the grid. */
function rowsOf(from: number, to: number): string {
  let out = '';
  for (let i = from; i <= to; i += 1) out += `L${String(i)}\n`;
  return out;
}

beforeEach(() => {
  server.lines = 900;
  server.rows = 43;
  server.perSpawn = 0;
  server.spawns = [];
});

describe('a copy from a busy pane is the lines selected (Phase 295)', () => {
  for (const perSpawn of [0, 1, 3, 40]) {
    it(`holds exactly lines 536 to 577 when the pane prints ${String(perSpawn)} line(s) a spawn`, async () => {
      server.perSpawn = perSpawn;
      const res = await capturePaneText({
        tmuxName: '$9',
        historyLines: 0,
        range: { start: 536, end: 577 },
        join: true
      });
      expect(res).toEqual({ ansi: rowsOf(536, 577), firstLine: 536 });
      // One invocation, so one spawn, whatever the pane prints.
      expect(server.spawns).toHaveLength(1);
    });
  }

  it('reads the extent and the lines in ONE invocation, and tmux computes the offsets', async () => {
    await capturePaneText({ tmuxName: '$9', historyLines: 0, range: { start: 536, end: 577 }, join: true });
    expect(server.spawns).toEqual([
      [
        'display-message', '-p', '-t', '$9', '-F', '#{history_size}\t#{pane_height}',
        ';',
        'capture-pane', '-p', '-e', '-J', '-t', '$9',
        '-S', '#{e|-:536,#{history_size}}',
        '-E', '#{e|-:577,#{history_size}}'
      ]
    ]);
  });

  it('keeps the wrapping for a picture: no -J when the copy does not join', async () => {
    await capturePaneText({ tmuxName: '$9', historyLines: 0, range: { start: 10, end: 12 } });
    const argv = server.spawns[0] ?? [];
    expect(argv.slice(argv.indexOf('capture-pane'))).toEqual([
      'capture-pane', '-p', '-e', '-t', '$9', '-S', '#{e|-:10,#{history_size}}', '-E', '#{e|-:12,#{history_size}}'
    ]);
  });
});

describe('the clamp, before and after the one call (Phase 209, Phase 295)', () => {
  it('starts a range above the oldest line at the oldest line, and says so', async () => {
    server.perSpawn = 3;
    const res = await capturePaneText({ tmuxName: '$9', historyLines: 0, range: { start: -30, end: 5 } });
    expect(res).toEqual({ ansi: rowsOf(0, 5), firstLine: 0 });
  });

  it('cuts an end below the screen at the last row', async () => {
    // 900 lines and 43 rows: the history is 857 and the last row is line 899.
    const res = await capturePaneText({ tmuxName: '$9', historyLines: 0, range: { start: 890, end: 5000 } });
    expect(res).toEqual({ ansi: rowsOf(890, 899), firstLine: 890 });
  });

  it('cuts it at the last row of the instant the lines were taken, on a busy pane', async () => {
    server.perSpawn = 7;
    // The one spawn sees 907 lines, so the last row is line 906.
    const res = await capturePaneText({ tmuxName: '$9', historyLines: 0, range: { start: 890, end: 5000 } });
    expect(res).toEqual({ ansi: rowsOf(890, 906), firstLine: 890 });
  });

  it('answers nothing for a range that is gone, and asks the session nothing', async () => {
    server.lines = 30;
    server.rows = 10;
    const res = await capturePaneText({ tmuxName: '$9', historyLines: 0, range: { start: -50, end: -40 } });
    expect(res).toEqual({ ansi: '', firstLine: 0 });
    expect(server.spawns).toHaveLength(0);
  });

  it('answers nothing for a start past the last row, though tmux printed the last row', async () => {
    // tmux clamps a start past the last row to the last row, so the one call
    // printed `L899`; the clamp after the call reads the same instant's extent
    // and throws it away.
    const res = await capturePaneText({ tmuxName: '$9', historyLines: 0, range: { start: 905, end: 910 } });
    expect(res).toEqual({ ansi: '', firstLine: 905 });
    expect(server.spawns).toHaveLength(1);
  });

  it('answers nothing after a Clear, rather than the screen', async () => {
    // A selection held across Clear: the history is gone and the range is now
    // past the last row of a 43-row screen.
    server.lines = 43;
    const res = await capturePaneText({ tmuxName: '$9', historyLines: 0, range: { start: 500, end: 520 } });
    expect(res).toEqual({ ansi: '', firstLine: 500 });
  });

  it('answers nothing for a start more than 32,767 rows below the top, which tmux reads as the live screen', async () => {
    const start = 857 + 40_000;
    const res = await capturePaneText({ tmuxName: '$9', historyLines: 0, range: { start, end: start + 3 } });
    expect(res).toEqual({ ansi: '', firstLine: start });
  });

  for (const bad of [
    { start: Number.NaN, end: 5 },
    { start: 5, end: Number.NaN },
    { start: Number.POSITIVE_INFINITY, end: 5 },
    { start: 5, end: Number.NEGATIVE_INFINITY },
    { start: 1.5, end: 9 },
    { start: 0, end: 9.5 }
  ]) {
    it(`refuses ${JSON.stringify(bad, (_k, v: unknown) => (typeof v === 'number' && !Number.isFinite(v) ? String(v) : v))} and asks the session nothing`, async () => {
      await expect(
        capturePaneText({ tmuxName: '$9', historyLines: 0, range: bad, join: true })
      ).rejects.toThrow();
      expect(server.spawns).toHaveLength(0);
    });
  }
});

describe('the last N lines are not a range', () => {
  it('leaves that argv exactly as it was', async () => {
    await capturePaneText({ tmuxName: '$9', historyLines: 207 });
    expect(server.spawns).toEqual([['capture-pane', '-p', '-e', '-t', '$9', '-S', '-207']]);
  });
});
