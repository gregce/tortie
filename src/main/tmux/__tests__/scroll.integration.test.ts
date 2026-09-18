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
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PANE_FORMAT } from '../../activity/panes';
import {
  readPaneScroll,
  resetSeekSupportForTests,
  scrollPaneTo,
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
 * A PARKED VIEW HOLDS ITS PLACE BY ITSELF (2026-09-16).
 *
 * The operator reported this about the pane he was reading: "if I type a
 * question and then press return... then I scroll back to its last message to
 * read it carefully. That message for some reason scrolls down whenever the
 * session generates more text."
 *
 * THE PRODUCT WAS THE CAUSE. Copy-mode does not slide a parked reader's
 * content as the agent writes — it holds it — and Phase 12.3 shipped a poll
 * that re-scrolled the pane on every tick on the belief that it did. So every
 * "correction" was an extra scroll on top of a view that was already still, and
 * it dragged the reader backwards by exactly what the agent had written. The
 * operator's second report named it: "it's just moving down instead of staying
 * anchored, but with the same exact cadence of the lines being produced."
 *
 * WHY A TERMINAL EMULATOR IS THE ONLY HONEST RULER HERE. `capture-pane` answers
 * the LIVE screen and never the copy-mode view, so the question "did the line
 * the reader is looking at move?" cannot be asked of tmux's own formats: a
 * live-screen reading advances with the output whatever the view does, which is
 * exactly how the founding measurement — "LINE-272 became LINE-280 after eight
 * new lines" — came to say a still view was sliding. So this rig attaches a
 * real client the way the app does, feeds the bytes it receives into
 * @xterm/xterm, and reads the FIRST VISIBLE LINE off that screen.
 *
 * The arms are: the line does not move while the transcript grows by a hundred
 * lines; and, for the record, applying the deleted correction every 250 ms DOES
 * move it — the defect, executable, so nobody rebuilds the mechanism on the
 * strength of a live-screen reading again.
 *
 * Opt-in with the rest of this file: `GMUX_SCROLL_IT=1 npx vitest run scroll.integration`.
 */
describe.skipIf(!enabled)('a parked view', () => {
  const S = 'zz-hold';
  let client: pty.IPty | null = null;
  let term: Terminal | null = null;
  let dir = '';

  const historyOf = async (): Promise<number> =>
    Number(
      (await tmux(['display-message', '-p', '-t', S, '#{history_size}'])).trim()
    );

  /** The first line a person would see at the top of the pane, or '(blank)'. */
  const firstVisible = (): string => {
    const buffer = term?.buffer.active ?? null;
    if (buffer === null) return '(no terminal)';
    for (let i = 0; i < 30; i += 1) {
      const line = buffer.getLine(i);
      const text = line === undefined ? '' : line.translateToString(true);
      if (text.trim() !== '') return text.trim();
    }
    return '(blank)';
  };

  /** The number in a fixture line, so an arm can say which way it moved. */
  const lineNumber = (text: string): number => {
    const m = /line (\d+)/.exec(text);
    return m === null ? -1 : Number(m[1]);
  };

  beforeAll(async () => {
    await tmux(['kill-server']).catch(() => undefined);
    dir = mkdtempSync(join(tmpdir(), 'gmux-scroll-hold-'));
    const script = join(dir, 'stream.sh');
    writeFileSync(
      script,
      '#!/bin/sh\ni=0\nwhile :; do i=$((i+1)); printf "line %s\\n" "$i"; sleep 0.05; done\n',
      { mode: 0o755 }
    );
    await tmux(['new-session', '-d', '-s', S, '-x', '100', '-y', '30', script]);
    // 200 lines of history before anybody parks, so a deep park is possible.
    for (let i = 0; i < 80; i += 1) {
      if ((await historyOf()) >= 200) break;
      await new Promise((r) => setTimeout(r, 250));
    }
    term = new Terminal({ cols: 100, rows: 30 });
    client = pty.spawn(TMUX, ['-L', SOCKET, 'attach', '-t', S], {
      cols: 100,
      rows: 30,
      env: process.env
    });
    client.onData((d: string) => term?.write(d));
    await new Promise((r) => setTimeout(r, 1200));
  }, 60_000);

  afterAll(async () => {
    if (client !== null) client.kill();
    await tmux(['kill-server']).catch(() => undefined);
  });

  const park = async (): Promise<void> => {
    await tmux(['send-keys', '-t', S, '-X', 'cancel']).catch(() => undefined);
    await new Promise((r) => setTimeout(r, 300));
    await tmux(['copy-mode', '-e', '-t', S]);
    const history = await historyOf();
    await tmux([
      'send-keys',
      '-t',
      S,
      '-X',
      'goto-line',
      String(Math.max(1, history - 150))
    ]);
    await new Promise((r) => setTimeout(r, 500));
  };

  it('holds the reader’s line by itself while the transcript keeps growing', async () => {
    await park();
    const first = firstVisible();
    const started = await historyOf();
    await new Promise((r) => setTimeout(r, 5000));
    const grown = (await historyOf()) - started;
    const later = firstVisible();
    // eslint-disable-next-line no-console
    console.log(
      `[park] first visible line "${first}" stayed "${later}" while history grew ${String(started)} -> ${String(started + grown)}`
    );
    expect(grown).toBeGreaterThan(50);
    expect(lineNumber(first)).toBeGreaterThan(0);
    expect(later).toBe(first);
  }, 60_000);

  it('and a correcting scroll is what moves it, for the record', async () => {
    await park();
    const first = firstVisible();
    const held = (await historyOf()) - (await readPaneScroll(runner, S)).position;
    for (let i = 0; i < 12; i += 1) {
      const history = await historyOf();
      const want = history - held;
      if (want > 0) {
        await tmux(['send-keys', '-t', S, '-X', 'goto-line', String(want)]);
      }
      await new Promise((r) => setTimeout(r, 250));
    }
    const later = firstVisible();
    // eslint-disable-next-line no-console
    console.log(
      `[park] the deleted rule moved the reader from "${first}" to "${later}"`
    );
    expect(later).not.toBe(first);
  }, 60_000);
});
