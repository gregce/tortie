/**
 * THE PROOF that a history copy on a busy pane is the lines asked for (Phase
 * 295), over a real tmux. Opt-in, because it streams three panes and makes
 * 800 copies:
 *
 *     GMUX_CAPTURE_IT=1 npx vitest run history-lines.integration
 *     GMUX_CAPTURE_IT=1 GMUX_TMUX_BIN=build/vendor/tmux/bin/tmux npx vitest run history-lines.integration
 *
 * The first runs the system tmux (`/opt/homebrew/bin/tmux`, 3.6a on the
 * machine this was written on), the second the bundled 3.7b.
 *
 * WHAT IT DRIVES. `captureHistoryLines` itself, through its runner, so the argv
 * is the one that ships: one invocation, the extent and the capture, with tmux
 * computing `-S` and `-E` from the history it holds at that instant. The rig is
 * the entry's own (docs/BACKLOG.md "## Phase 295 —"): a pane running perl that
 * prints `L<n>`, 2,000 lines at once and then one line per interval, so grid
 * line n holds `Ln` and every answer names its own line; each trial asks for
 * exactly one line, 200 above the history as last read; 300, 300 and 200 copies
 * at about 10, 80 and 700 lines a second. ZERO OFF is required.
 *
 * THE CONTROL, in the same file, issues the parent's two calls (a read of the
 * extent, then a capture whose offsets were computed from it, each its own
 * client) at about 80 lines a second, and must read off at least once, which
 * proves this rig can see the defect it says is gone. MEASURED on 2026-11-05 by
 * the spec step's rig: the pair was off 58 of 300 on 3.7b and 106 of 300 on
 * 3.6a at that rate.
 *
 * A run counts only when line 0 still reads `L0` at its end, so a history trim
 * cannot pass for a correct copy.
 *
 * SAFETY. Its own server on its own socket name, under a TMUX_TMPDIR of its own
 * made under the temporary directory, so the socket file never lands beside the
 * operator's; `kill-server` and the directory's removal are in a `finally`. It
 * never names `-L gmux`.
 */

import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { captureHistoryLines } from '../history-lines';
import type { TmuxScrollRunner } from '../scroll';

const run = promisify(execFile);

const enabled = process.env['GMUX_CAPTURE_IT'] === '1';
const TMUX = process.env['GMUX_TMUX_BIN'] ?? '/opt/homebrew/bin/tmux';
const SOCKET = `zz295it-${String(process.pid)}`;

let dir = '';
let conf = '';

function env(): NodeJS.ProcessEnv {
  return { ...process.env, TMUX_TMPDIR: dir, LANG: 'en_US.UTF-8' };
}

async function tmux(args: readonly string[]): Promise<string> {
  const { stdout } = await run(TMUX, ['-L', SOCKET, ...args], {
    env: env(),
    maxBuffer: 64 * 1024 * 1024,
    timeout: 15_000
  });
  return stdout;
}

/** The runner shape the production function takes, over this rig's server. */
const runner: TmuxScrollRunner = (args) => tmux(args);

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** The line a capture's first row names, or null. */
function lineOf(text: string | undefined): number | null {
  const m = /^L(\d+)$/.exec(text ?? '');
  return m === null ? null : Number(m[1]);
}

/**
 * Start a pane printing `L<n>`, 2,000 at once and then one every `interval`
 * seconds, and answer its `$`-id, which is how the product addresses a pane
 * (`resolvePaneTarget`), because `=name` is not a pane target.
 */
async function stream(name: string, interval: number): Promise<string> {
  const perl =
    '$|=1; for $i (0..1999) { print "L$i\\n" } $n=2000; ' +
    `while (1) { select(undef,undef,undef,${String(interval)}); print "L".$n++."\\n" }`;
  const id = (
    await tmux(['new-session', '-d', '-P', '-F', '#{session_id}', '-s', name, '-x', '200', '-y', '40', '--', '/usr/bin/perl', '-e', perl])
  ).trim();
  await sleep(800);
  return id;
}

async function historyOf(name: string): Promise<number> {
  return Number((await tmux(['display-message', '-p', '-t', name, '#{history_size}'])).trim());
}

/** How many of `trials` copies of one line came back as another line, and by how much. */
async function measure(
  name: string,
  trials: number,
  copy: (want: number) => Promise<string | undefined>
): Promise<{ off: number; worst: number; lineZero: string }> {
  let off = 0;
  let worst = 0;
  for (let i = 0; i < trials; i += 1) {
    const want = (await historyOf(name)) - 200;
    const got = lineOf(await copy(want));
    const by = got === null ? Number.POSITIVE_INFINITY : Math.abs(got - want);
    if (by !== 0) {
      off += 1;
      worst = Math.max(worst, by);
    }
  }
  const lineZero =
    (await tmux(['capture-pane', '-p', '-t', name, '-S', '-', '-E', '-'])).split('\n')[0] ?? '';
  return { off, worst, lineZero };
}

describe.skipIf(!enabled)('a history copy on a busy pane, one invocation', () => {
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), 'gmux-p295-it-'));
    conf = join(dir, 'p295.conf');
    // A deep history, so nothing is trimmed during a run, and a server that
    // stays up between panes.
    writeFileSync(conf, 'set -g history-limit 500000\nset -s exit-empty off\n');
    await tmux(['-f', conf, 'start-server']);
  }, 30_000);

  afterAll(async () => {
    try {
      await tmux(['kill-server']).catch(() => undefined);
    } finally {
      if (dir !== '') rmSync(dir, { recursive: true, force: true });
    }
  });

  for (const rate of [
    { label: 'about 10 lines a second', interval: 0.1, trials: 300 },
    { label: 'about 80 lines a second', interval: 0.0125, trials: 300 },
    { label: 'about 700 lines a second', interval: 0.0014, trials: 200 }
  ]) {
    it(`is exact at ${rate.label}, ${String(rate.trials)} copies`, async () => {
      const name = `p295-${String(Math.round(1 / rate.interval))}`;
      const id = await stream(name, rate.interval);
      try {
        const result = await measure(id, rate.trials, async (want) => {
          const lines = await captureHistoryLines(id, want, want, true, runner);
          return lines.ansi.split('\n')[0];
        });
        // eslint-disable-next-line no-console
        console.log(`[295] ${TMUX} ${rate.label}: one invocation off ${String(result.off)} of ${String(rate.trials)}; line 0 ${result.lineZero}`);
        expect(result.lineZero).toBe('L0');
        expect(result.off).toBe(0);
      } finally {
        await tmux(['kill-session', '-t', `=${name}`]).catch(() => undefined);
      }
    }, 120_000);
  }

  it('for the record: the two-call pair it replaced is off at about 80 lines a second', async () => {
    const name = 'p295-pair';
    const id = await stream(name, 0.0125);
    try {
      const result = await measure(id, 300, async (want) => {
        // The parent's two calls, each its own client: read the extent, then
        // capture with offsets main computed from it.
        const extent = (await tmux(['display-message', '-p', '-t', id, '-F', '#{history_size}\t#{pane_height}'])).split('\n')[0] ?? '';
        const at = want - Number(extent.split('\t')[0]);
        const out = await tmux(['capture-pane', '-p', '-e', '-J', '-t', id, '-S', String(at), '-E', String(at)]);
        return out.split('\n')[0];
      });
      // eslint-disable-next-line no-console
      console.log(`[295] ${TMUX} the two-call pair: off ${String(result.off)} of 300, by up to ${String(result.worst)}; line 0 ${result.lineZero}`);
      expect(result.lineZero).toBe('L0');
      expect(result.off).toBeGreaterThan(0);
    } finally {
      await tmux(['kill-session', '-t', `=${name}`]).catch(() => undefined);
    }
  }, 120_000);
});
