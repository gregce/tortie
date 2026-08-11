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
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PANE_FORMAT } from '../../activity/panes';
import { resetSeekSupportForTests, scrollPaneTo, type TmuxScrollRunner } from '../scroll';

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
