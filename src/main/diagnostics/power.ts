/**
 * The energy read (Phase 168): one `top` spawn, on demand, inside the
 * capture window that is already open, never on a timer.
 *
 * macOS `top` exposes a per process POWER column, the same accounting
 * Activity Monitor draws as Energy Impact. It is a SCORE rather than watts;
 * the exact energy counter needs native code and Tortie ships none, so the
 * surface labels the figure an impact score and goes no further. The read
 * asks for two samples because the first logging sample counts since boot
 * and only the second is a rate over the gap between them; `-s 0` makes
 * that gap the walk's own cost, measured at about 0.9 seconds for 998
 * processes on 2026-08-30, with the whole spawn settling in about 1.9
 * seconds. The spawn is started when the capture window opens so those
 * seconds overlap the window a person is already waiting out.
 *
 * The second sample also gives a %CPU over the same gap for EVERY process,
 * which is what the glance strip's CPU figures read: Electron can only
 * sample its own processes and `ps` only gives a lifetime average, and the
 * strip wants one ruler over Tortie and agents alike.
 *
 * On hardware where top has no POWER column the answer is null, never
 * zero, and the surface says unavailable. The parse half is pure and the
 * unit test drives it; the run goes through the guarded runner and settles
 * inside its deadline whatever the tool does.
 */

import { runGuarded } from '../proc/guarded';

export const TOP_BIN = '/usr/bin/top';

/** The argv for one read. Pure, so a test can pin it. */
export function topArgs(): string[] {
  return ['-l', '2', '-s', '0', '-stats', 'pid,cpu,power'];
}

export interface PowerSample {
  /** pid to percent of one core over the sample gap. */
  cpuByPid: Map<number, number>;
  /**
   * pid to top's power score over the same gap, or null when the POWER
   * column is unavailable on this hardware.
   */
  powerByPid: Map<number, number> | null;
}

/** `376    39.0 40.0` or, with no power column, `376    39.0` */
const ROW = /^\s*(\d+)\s+([\d.]+)(?:\s+([\d.]+))?\s*$/;

/**
 * The LAST sample block in `top -l 2` output: the lines after the final
 * `PID …` header. The first block counts since boot and is discarded.
 * Null when no header line was found at all.
 */
export function parseTopSample(stdout: string): PowerSample | null {
  const lines = stdout.split('\n');
  let headerAt = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i]?.trimStart().startsWith('PID')) headerAt = i;
  }
  if (headerAt === -1) return null;
  const hasPower = (lines[headerAt] ?? '').includes('POWER');
  const cpuByPid = new Map<number, number>();
  const powerByPid = hasPower ? new Map<number, number>() : null;
  for (let i = headerAt + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (line.trim() === '') continue;
    const m = ROW.exec(line);
    if (m === null) break;
    const pid = Number(m[1]);
    cpuByPid.set(pid, Number(m[2]));
    if (powerByPid !== null && m[3] !== undefined) {
      powerByPid.set(pid, Number(m[3]));
    }
  }
  return { cpuByPid, powerByPid };
}

export interface PowerDeps {
  /** Injectable for tests. Default: the guarded runner over the real tool. */
  run?(args: readonly string[]): Promise<string>;
}

/**
 * Take one two sample read. About two seconds of wall clock, meant to be
 * started when the capture window opens so it overlaps the wait the window
 * already is. Null when the tool is missing, errors or prints nothing
 * usable; never a throw.
 */
export async function readPowerSample(
  deps: PowerDeps = {}
): Promise<PowerSample | null> {
  const run =
    deps.run ??
    (async (args: readonly string[]): Promise<string> => {
      const r = await runGuarded(TOP_BIN, args, {
        timeoutMs: 10_000,
        maxOutputBytes: 8 * 1024 * 1024
      });
      return r.spawnError === null && !r.timedOut ? r.stdout : '';
    });
  try {
    return parseTopSample(await run(topArgs()));
  } catch {
    return null;
  }
}
