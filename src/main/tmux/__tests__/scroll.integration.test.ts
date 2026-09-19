/**
 * THE PROOF that the scrollbar drag no longer starves the tmux server
 * (Phase 13.7). Opt-in — `GMUX_SCROLL_IT=1 npx vitest run scroll.integration`
 * — because it fills a 200,000-line pane and takes about a minute.
 *
 * It is checked in rather than run once and written up, because
 * docs/research/23-scrollback-limits.md §7.2 listed exactly this as still
 * unmeasured: "Someone must verify that tmux actually services other clients
 * before the max is raised on the strength of it." This file is that
 * verification, executable.
 *
 * WHAT IT MEASURES. A second client polls with the REAL `PANE_FORMAT` —
 * byte-for-byte the query src/main/activity/panes.ts makes once a second to
 * decide which agent needs the user — at 20 Hz, while the drag runs. The
 * worst round trip that poller sees IS the starvation. Before the fix it was
 * 3,895 ms; the whole fleet's status detection, output and input stopped for
 * four seconds because someone dragged a scrollbar.
 *
 * SAFETY. Own throwaway socket, `zz-` session names, killed in `afterAll`.
 * It never touches `-L gmux` and never reads the user's sessions.
 */

import { execFile } from 'node:child_process';
import * as pty from 'node-pty';
import { Terminal } from '@xterm/xterm';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PANE_FORMAT } from '../../activity/panes';
import {
  readPaneScroll,
  resetSeekSupportForTests,
  scrollPaneBy,
  scrollPaneTo,
  type PaneScrollState,
  type TmuxScrollRunner
} from '../scroll';

const run = promisify(execFile);

const SOCKET = 'zz137it';
const TMUX = process.env['GMUX_TMUX_BIN'] ?? '/opt/homebrew/bin/tmux';
const CONF = join(__dirname, '../../../../resources/gmux-tmux.conf');
const TARGET_LINES = 200_000;
const SESSION = 'zz-scroll-it';

/** How long the poll may stall before this is a starved fleet, not a scroll. */
const POLL_STALL_BUDGET_MS = 250;
/** A full-height drag must feel instant, whatever the depth. */
const SEEK_BUDGET_MS = 500;

const enabled = process.env['GMUX_SCROLL_IT'] === '1';

async function tmux(args: string[]): Promise<string> {
  const { stdout } = await run(TMUX, ['-L', SOCKET, ...args], {
    maxBuffer: 64 * 1024 * 1024
  });
  return stdout;
}

/** The runner shape the production module takes. */
const runner: TmuxScrollRunner = (args) => tmux([...args]);

async function historySize(): Promise<number> {
  return Number((await tmux(['display-message', '-p', '-t', SESSION, '#{history_size}'])).trim());
}

/**
 * Poll exactly as the activity monitor does, recording the worst round trip.
 * 20 Hz rather than 1 Hz so a stall of any length is certain to be sampled.
 */
function startPoll(): { stop: () => Promise<{ worstMs: number; samples: number }> } {
  let running = true;
  let worstMs = 0;
  let samples = 0;
  const loop = (async (): Promise<void> => {
    while (running) {
      const at = performance.now();
      await tmux(['list-panes', '-a', '-F', PANE_FORMAT]).catch(() => '');
      worstMs = Math.max(worstMs, performance.now() - at);
      samples += 1;
      await new Promise((r) => setTimeout(r, 50));
    }
  })();
  return {
    stop: async () => {
      running = false;
      await loop;
      return { worstMs, samples };
    }
  };
}

describe.skipIf(!enabled)('a full-height drag on a 200,000-line session', () => {
  beforeAll(async () => {
    await tmux(['kill-server']).catch(() => undefined);
    // history-limit binds at PANE CREATION, so the depth has to be on the
    // server before the pane under test exists.
    await tmux(['-f', CONF, 'new-session', '-d', '-s', 'zz-boot', '/bin/sh']);
    await tmux(['set', '-g', 'history-limit', String(TARGET_LINES)]);
    await tmux(['new-session', '-d', '-s', SESSION, '-x', '162', '-y', '42', '/bin/sh']);
    await tmux(['kill-session', '-t', 'zz-boot']);

    const dir = mkdtempSync(join(tmpdir(), 'gmux-scroll-it-'));
    const file = join(dir, 'fill.txt');
    const line = `${'x'.repeat(149)}\n`;
    writeFileSync(file, line.repeat(TARGET_LINES));
    await tmux(['send-keys', '-t', SESSION, `cat ${file}`, 'Enter']);
    for (let i = 0; i < 120; i++) {
      if ((await historySize()) >= TARGET_LINES - 200) break;
      await new Promise((r) => setTimeout(r, 500));
    }
    expect(await historySize()).toBeGreaterThan(TARGET_LINES - 200);
  }, 180_000);

  afterAll(async () => {
    await tmux(['kill-server']).catch(() => undefined);
  });

  it('scrubs to the top without stalling the activity poll', async () => {
    resetSeekSupportForTests();
    await tmux(['send-keys', '-t', SESSION, '-X', 'cancel']).catch(() => undefined);

    const poll = startPoll();
    await new Promise((r) => setTimeout(r, 500)); // let the poll settle

    const at = performance.now();
    const state = await scrollPaneTo(runner, SESSION, TARGET_LINES);
    const seekMs = performance.now() - at;

    const { worstMs, samples } = await poll.stop();
    // eslint-disable-next-line no-console
    console.log(
      `[13.7] seek ${seekMs.toFixed(0)} ms · worst poll round trip ` +
        `${worstMs.toFixed(0)} ms over ${samples} samples`
    );

    expect(state.position).toBeGreaterThan(TARGET_LINES - 200);
    expect(seekMs).toBeLessThan(SEEK_BUDGET_MS);
    expect(worstMs).toBeLessThan(POLL_STALL_BUDGET_MS);
  }, 60_000);

  it('records what the OLD per-line scroll cost, for the record', async () => {
    // Not an assertion about the product — a measurement of the defect, so
    // the ratio in scroll.ts's header stays honest if tmux ever changes.
    await tmux(['send-keys', '-t', SESSION, '-X', 'cancel']).catch(() => undefined);
    await tmux(['copy-mode', '-e', '-t', SESSION]);

    const poll = startPoll();
    await new Promise((r) => setTimeout(r, 500));
    const at = performance.now();
    await tmux(['send-keys', '-t', SESSION, '-X', '-N', String(TARGET_LINES), 'scroll-up']);
    const walkMs = performance.now() - at;
    const { worstMs } = await poll.stop();
    // eslint-disable-next-line no-console
    console.log(
      `[13.7] OLD walk ${walkMs.toFixed(0)} ms · worst poll round trip ${worstMs.toFixed(0)} ms`
    );

    // The defect is real and this rig can see it — if this ever stops being
    // true the comparison above has stopped meaning anything.
    expect(walkMs).toBeGreaterThan(SEEK_BUDGET_MS);
    expect(worstMs).toBeGreaterThan(POLL_STALL_BUDGET_MS);
  }, 60_000);
});

/**
 * A PARKED VIEW HOLDS ITS PLACE BY ITSELF (pull request 30, John Berryman,
 * opened 2026-09-18 on his measurement of 2026-09-16; made honest and cheap in
 * Phase 292).
 *
 * The report his commit quotes in its own comment (it is in neither GitHub
 * issue 29's text nor the pull request's), about the pane being read: "if I
 * type a question and then press return... then I scroll back to its last
 * message to read it carefully. That message for some reason scrolls down
 * whenever the session generates more text." And the second one, which named
 * it: "it's just moving down instead of staying anchored, but with the same
 * exact cadence of the lines being produced."
 *
 * THE PRODUCT WAS THE CAUSE, and `../scroll.ts`'s `scrollPaneTo` carries the one
 * account of it: what Phase 12.3 believed, which ruler it read, and why neither
 * `capture-pane` nor tmux's own formats can see a scrolled-back view. This file
 * does not retell it. What it owns is THE RULER that account names as the only
 * honest one: it attaches a real client the way the app does, under the app's
 * own `resources/gmux-tmux.conf`, feeds the bytes that client receives into
 * @xterm/xterm, and reads ROW 0 of that screen.
 *
 * ROW 0, AND NOT THE FIRST ROW WITH TEXT ON IT (Phase 292). The rig used to walk
 * down to the first non-blank row. A blank row 0 is a READING, being a view that
 * is somewhere nobody meant it to be, and a ruler that steps past it answers a
 * different question from the one a person's eyes ask. The app's config is what
 * makes row 0 plain text: it sets `copy-mode-position-format ""`, and without
 * it tmux draws its `[position/history]` indicator on that row.
 *
 * The arms are: row 0 does not move while the transcript grows under it, with
 * `#{scroll_position}` unchanged and `#{history_size}` growing, which is the
 * frozen frame the scrollbar's honest thumb is computed from; and, for the
 * record, MAIN'S DELETED RULE, driven as it shipped at main's cadence, DOES
 * move it, one line for every line printed. The defect stays executable, so
 * nobody rebuilds the mechanism on the strength of a live-screen reading again.
 *
 * COST, MEASURED 2026-09-18 on the system tmux 3.6a: the describe as pull
 * request 30 wrote it took 24.4 s, 10 s of that waiting for a 20 lines a second
 * stream to reach 200 lines of history. The fixture now prints its first 260
 * lines at once and only then settles to the issue's own cadence, a line every
 * 50 ms, and the describe takes 12.0 s, read five times over the system 3.6a
 * and the bundled 3.7b (`GMUX_TMUX_BIN`), both arms green and the same numbers
 * on each. Nearly all of what is left is the two holds themselves, five
 * seconds and three. It is still opt-in with the rest of this file,
 * `GMUX_SCROLL_IT=1 npx vitest run scroll.integration -t "parked view"`, and
 * whether it joins the battery is a budget question and not this file's.
 */

/**
 * MAIN'S RULE, KEPT ONLY TO PROVE WHAT IT DID (Phase 292).
 *
 * This is `anchorPaneScroll` as it shipped from Phase 12.3 until pull request
 * 30 deleted it, copied from `src/main/tmux/scroll.ts` at `ac011d9d` with the
 * arithmetic untouched: `grew` is the live history less the history the caller
 * last drew, the same three early returns, the same `room`, and the scroll UP
 * by `min(grew, room)` goes through the production `scrollPaneBy`, so the tmux
 * commands are the ones the app sent. The arm that first stood here drove a
 * `goto-line` rule of its own invention, which proved that SOME correction
 * moves the view and not that the shipped one did.
 *
 * It is a FIXTURE. `scroll.test.ts` pins that the module exports no such name
 * and that the renderer sends no `anchorFrom`, and the one caller of this copy
 * is the arm below.
 */
async function mainsDeletedAnchorRule(
  run: TmuxScrollRunner,
  target: string,
  seenHistory: number
): Promise<PaneScrollState> {
  const state = await readPaneScroll(run, target);
  const grew = state.history - Math.max(0, Math.trunc(seenHistory));
  if (!state.inMode || state.position === 0 || grew <= 0) return state;
  const room = state.history - state.position;
  return scrollPaneBy(run, target, Math.min(grew, room));
}

/** Main's `SCROLLED_POLL_MS`, the cadence the renderer ran that rule at. */
const MAINS_POLL_MS = 250;

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe.skipIf(!enabled)('a parked view', () => {
  const S = 'zz-hold';
  let client: pty.IPty | null = null;
  let term: Terminal | null = null;
  let dir = '';

  /**
   * ROW 0 of the attached client's screen, as a person's eyes have it. Blank
   * is answered as the empty string and never skipped past: see the header.
   * `baseY` is the top of the screen whatever the buffer holds above it, and
   * an attached tmux client lives in the alternate buffer, where it is 0.
   */
  const firstVisible = (): string => {
    const buffer = term?.buffer.active ?? null;
    if (buffer === null) return '(no terminal)';
    const line = buffer.getLine(buffer.baseY);
    return line === undefined ? '' : line.translateToString(true);
  };

  /** The number in a fixture line, so an arm can say which way it moved. */
  const lineNumber = (text: string): number => {
    const m = /^line (\d+)$/.exec(text);
    return m === null ? -1 : Number(m[1]);
  };

  beforeAll(async () => {
    await tmux(['kill-server']).catch(() => undefined);
    dir = mkdtempSync(join(tmpdir(), 'gmux-scroll-hold-'));
    const script = join(dir, 'stream.sh');
    // 260 lines at once, so a deep park is possible the moment the pane
    // exists, and then the issue's own cadence: a line every 50 ms.
    writeFileSync(
      script,
      '#!/bin/sh\ni=0\n' +
        'while [ "$i" -lt 260 ]; do i=$((i+1)); printf "line %s\\n" "$i"; done\n' +
        'while :; do i=$((i+1)); printf "line %s\\n" "$i"; sleep 0.05; done\n',
      { mode: 0o755 }
    );
    // The app's own config, because it is what decides what row 0 carries
    // (no status line, no position indicator) and the claim is about the app.
    await tmux([
      '-f', CONF, 'new-session', '-d', '-s', S, '-x', '100', '-y', '30', script
    ]);
    for (let i = 0; i < 40; i += 1) {
      if ((await readPaneScroll(runner, S)).history >= 200) break;
      await sleep(100);
    }
    term = new Terminal({ cols: 100, rows: 30 });
    client = pty.spawn(TMUX, ['-L', SOCKET, 'attach', '-t', S], {
      cols: 100,
      rows: 30,
      env: process.env
    });
    client.onData((d: string) => term?.write(d));
    await sleep(1200);
  }, 60_000);

  afterAll(async () => {
    try {
      if (client !== null) client.kill();
    } finally {
      // Ends the stream with the server it lives in, whatever happened above.
      await tmux(['kill-server']).catch(() => undefined);
      if (dir !== '') rmSync(dir, { recursive: true, force: true });
    }
  });

  /**
   * Park 150 lines below the TOP of the history as it is at this moment:
   * `goto-line N` sets `#{scroll_position}` to N, which counts from the bottom,
   * so `history - 150` is 150 lines down from the oldest line (a run read
   * position 108 of a history of 266, and row 0 "line 150").
   */
  const park = async (): Promise<PaneScrollState> => {
    await tmux(['send-keys', '-t', S, '-X', 'cancel']).catch(() => undefined);
    await sleep(300);
    await tmux(['copy-mode', '-e', '-t', S]);
    const { history } = await readPaneScroll(runner, S);
    await tmux([
      'send-keys',
      '-t',
      S,
      '-X',
      'goto-line',
      String(Math.max(1, history - 150))
    ]);
    await sleep(500);
    return readPaneScroll(runner, S);
  };

  it('holds the reader’s line by itself while the transcript keeps growing', async () => {
    const parked = await park();
    const first = firstVisible();
    await sleep(5000);
    const after = await readPaneScroll(runner, S);
    const later = firstVisible();
    // eslint-disable-next-line no-console
    console.log(
      `[park] row 0 "${first}" stayed "${later}" while history grew ` +
        `${String(parked.history)} -> ${String(after.history)} and ` +
        `scroll_position read ${String(parked.position)} -> ${String(after.position)}`
    );
    expect(after.history - parked.history).toBeGreaterThan(50);
    expect(lineNumber(first)).toBeGreaterThan(0);
    expect(later).toBe(first);
    // THE FROZEN FRAME. tmux counts `scroll_position` from the bottom as it
    // was when the pane entered copy mode, so a still view answers a still
    // number while the live history grows past it. The renderer's
    // `distanceFromLive` adds that growth back for the thumb, and this is the
    // fact it stands on: if a tmux ever re-bases the position by itself, this
    // goes red here before the thumb starts counting the growth twice.
    expect(after.position).toBe(parked.position);
  }, 60_000);

  it('and a correcting scroll is what moves it, for the record', async () => {
    const parked = await park();
    const first = firstVisible();
    // The renderer's poll as main had it: every tick it sent the history it
    // last drew as `anchorFrom`, and drew whatever the rule answered.
    let drawn = parked;
    for (let tick = 0; tick < 12; tick += 1) {
      await sleep(MAINS_POLL_MS);
      drawn = await mainsDeletedAnchorRule(runner, S, drawn.history);
    }
    await sleep(500);
    const later = firstVisible();
    const printed = drawn.history - parked.history;
    const moved = lineNumber(first) - lineNumber(later);
    // eslint-disable-next-line no-console
    console.log(
      `[park] main's deleted rule moved the reader from "${first}" to "${later}", ` +
        `${String(moved)} lines toward older text while ${String(printed)} were printed, ` +
        `scroll_position ${String(parked.position)} -> ${String(drawn.position)}`
    );
    expect(later).not.toBe(first);
    // Toward OLDER text, which is the issue's "it scrolls in the reverse
    // direction".
    expect(lineNumber(later)).toBeGreaterThan(0);
    expect(moved).toBeGreaterThan(0);
    // And THE SCREEN FELL BY EXACTLY WHAT THE RULE SCROLLED: the two rulers
    // agree to the line, so the rule is the whole of the movement and nothing
    // else in this rig moves a parked view. `moved` runs a few lines short of
    // `printed` here and that is the rule's own arithmetic, not slack in the
    // reading: its answer carries the history of its SECOND read, so a line
    // printed between its two reads is never added back, and over one tmux
    // process per command that gap is tens of milliseconds a tick.
    expect(moved).toBe(drawn.position - parked.position);
  }, 60_000);
});

/**
 * A RESIZE KEEPS THE READER'S LINE BY ITSELF (Phase 292, the fix round).
 *
 * The attack verifier's `wrapq` arm, in the app, over 900 soft-wrapped lines
 * parked 720 rows back: tmux alone had the reader's line exactly right 150 ms
 * after a widening, and the renderer's hold, which re-sent the pre-resize
 * `#{scroll_position}` 300 ms after it, threw the reader 127 lines. The number
 * counts ROWS, and a rewrap changes how many rows lie below the reader.
 *
 * What holds the line now is tmux: across a reflow it keeps the line its copy
 * cursor is on and puts that line on the top row, and `scrollPaneBy` and
 * `scrollPaneTo` put the cursor on the top row after every scroll that parks
 * (`cursorToTopRow` in ../scroll.ts). This describe is that claim at the tmux
 * layer, with the same ruler as the one above: row 0 of an attached client.
 *
 * Three arms. The production park holds its line across a widening, a
 * narrowing, a second widening and a change of height. For the record, a park
 * that leaves the cursor where a wheel scroll leaves it moves on the first
 * resize, which is the "rows - 1 jump" a window resize used to make. And for
 * the record, the deleted hold's re-send, driven through the production
 * `scrollPaneTo`, moves a line tmux had kept.
 */
describe.skipIf(!enabled)('a resize while parked over soft-wrapped lines', () => {
  const S = 'zz-wrap';
  let client: pty.IPty | null = null;
  let term: Terminal | null = null;
  let dir = '';

  /** The logical line row 0 belongs to: every row of line N carries ` wN`. */
  const lineOnRowZero = (): number => {
    const buffer = term?.buffer.active ?? null;
    if (buffer === null) return -1;
    const text = buffer.getLine(buffer.baseY)?.translateToString(true) ?? '';
    const token = /(?:^| )w(\d+)(?: |$)/.exec(text) ?? /^line (\d+)/.exec(text);
    return token === null ? -1 : Number(token[1]);
  };

  const resizeClient = async (cols: number, rows: number): Promise<void> => {
    client?.resize(cols, rows);
    term?.resize(cols, rows);
    await sleep(500);
  };

  beforeAll(async () => {
    await tmux(['kill-server']).catch(() => undefined);
    dir = mkdtempSync(join(tmpdir(), 'gmux-scroll-wrap-'));
    const script = join(dir, 'wrap.sh');
    // 900 lines of about 290 characters, all at once, then nothing: a QUIET
    // pane, so the resize is the only thing that can move the reader.
    writeFileSync(
      script,
      '#!/bin/sh\n' +
        "awk 'BEGIN { for (i = 1; i <= 900; i++) { s = \"line \" i; " +
        'for (k = 0; k < 55; k++) s = s " w" i; print s } }\'\n' +
        'exec sleep 600\n',
      { mode: 0o755 }
    );
    await tmux([
      '-f', CONF, 'new-session', '-d', '-s', S, '-x', '124', '-y', '44', script
    ]);
    for (let i = 0; i < 40; i += 1) {
      if ((await readPaneScroll(runner, S)).history >= 2000) break;
      await sleep(100);
    }
    term = new Terminal({ cols: 124, rows: 44 });
    client = pty.spawn(TMUX, ['-L', SOCKET, 'attach', '-t', S], {
      cols: 124,
      rows: 44,
      env: process.env
    });
    client.onData((d: string) => term?.write(d));
    await sleep(1200);
  }, 60_000);

  afterAll(async () => {
    try {
      if (client !== null) client.kill();
    } finally {
      await tmux(['kill-server']).catch(() => undefined);
      if (dir !== '') rmSync(dir, { recursive: true, force: true });
    }
  });

  /** Back to live and the client's first size, so each arm starts alike. */
  const reset = async (): Promise<void> => {
    await tmux(['send-keys', '-t', S, '-X', 'cancel']).catch(() => undefined);
    await resizeClient(124, 44);
  };

  it('holds the line across widen, narrow, widen and a change of height, on the production park', async () => {
    await reset();
    await scrollPaneBy(runner, S, 720);
    await sleep(400);
    const parked = lineOnRowZero();
    const seen: number[] = [];
    const sizes: ReadonlyArray<readonly [number, number]> = [
      [152, 44],
      [124, 44],
      [152, 44],
      [152, 37],
      [152, 44]
    ];
    for (const [cols, rows] of sizes) {
      await resizeClient(cols, rows);
      seen.push(lineOnRowZero());
    }
    const state = await readPaneScroll(runner, S);
    // eslint-disable-next-line no-console
    console.log(
      `[wrap] parked on line ${String(parked)}; after 124->152->124->152 cols and 44->37->44 rows ` +
        `row 0 read ${JSON.stringify(seen)}; still in copy mode ${String(state.inMode)}`
    );
    expect(parked).toBeGreaterThan(0);
    expect(state.inMode).toBe(true);
    expect(seen).toEqual(seen.map(() => parked));
  }, 60_000);

  it('for the record: a park that leaves the copy cursor where a wheel scroll does moves on the first resize', async () => {
    await reset();
    await tmux(['copy-mode', '-e', '-t', S]);
    await tmux(['send-keys', '-t', S, '-X', '-N', '720', 'scroll-up']);
    await sleep(400);
    const parked = lineOnRowZero();
    await resizeClient(152, 44);
    const after = lineOnRowZero();
    // eslint-disable-next-line no-console
    console.log(
      `[wrap] without the cursor on the top row, one widening moved row 0 from line ${String(parked)} to line ${String(after)}`
    );
    expect(parked).toBeGreaterThan(0);
    expect(after).toBeGreaterThan(parked);
  }, 60_000);

  it('for the record: re-sending the position read before a widening moves a line tmux had kept', async () => {
    await reset();
    const before = await scrollPaneBy(runner, S, 720);
    await sleep(400);
    const parked = lineOnRowZero();
    await resizeClient(152, 44);
    const kept = lineOnRowZero();
    // What `holdPositionAcrossResize` did 300 ms after a resize, until the
    // Phase 292 fix round deleted it.
    await scrollPaneTo(runner, S, before.position);
    await sleep(400);
    const resent = lineOnRowZero();
    // eslint-disable-next-line no-console
    console.log(
      `[wrap] parked on line ${String(parked)}, tmux kept line ${String(kept)} across the widening, ` +
        `and re-sending position ${String(before.position)} moved it to line ${String(resent)}`
    );
    expect(kept).toBe(parked);
    expect(Math.abs(resent - parked)).toBeGreaterThan(1);
  }, 60_000);
});
