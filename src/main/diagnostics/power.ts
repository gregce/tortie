/**
 * The energy and memory read (Phase 168, widened in Phase 170): one `top`
 * spawn, on demand, inside the capture window that is already open, never
 * on a timer.
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
 * PHASE 170 ADDED THE MEM COLUMN, AND IT IS THE PHYSICAL FOOTPRINT. This
 * is the fix for every "not read" row: `/usr/bin/footprint` costs tens to
 * hundreds of milliseconds PER PID (it walks the target's VM regions), so
 * the one batched call over a capture shaped set of 155 pids took 7.35
 * seconds on 2026-08-30 against the guarded runner's 5 second deadline,
 * was killed with its output still sitting in its own block buffer, and
 * the report got nothing. `top`'s MEM column is the same kernel ledger:
 * verified per pid against `/usr/bin/footprint` the same day, 925M against
 * 925.05 MiB, 1634M against 1634.5 MiB, 222M against 221.6 MiB, while ps
 * rss for the last one read 2.7 GB. It covers every process on the machine
 * in the one spawn the capture already pays, and adding the column moved
 * the wall time by nothing measurable (three runs each way, 2.35 to 2.86 s
 * without, 2.19 to 2.34 s with). The cost of that trade is precision: top
 * rounds to whole K, M or G units, so a figure can sit up to half a unit
 * from the byte exact one.
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
  return ['-l', '2', '-s', '0', '-stats', 'pid,cpu,power,mem'];
}

export interface PowerSample {
  /** pid to percent of one core over the sample gap. */
  cpuByPid: Map<number, number>;
  /**
   * pid to top's power score over the same gap, or null when the POWER
   * column is unavailable on this hardware.
   */
  powerByPid: Map<number, number> | null;
  /**
   * pid to physical footprint bytes from top's MEM column, the same ledger
   * Activity Monitor's Memory column shows, rounded by top to whole K, M
   * or G units. Null when the column is unavailable.
   */
  memBytesByPid: Map<number, number> | null;
}

/** `482M+`, `2179K`, `9G`, `0B`, a size with a unit and an optional delta. */
const MEM = /^(\d+(?:\.\d+)?)([BKMG])[+-]?$/;

const UNIT: Record<string, number> = {
  B: 1,
  K: 1024,
  M: 1024 * 1024,
  G: 1024 * 1024 * 1024
};

/** top's MEM token to bytes, or null when the token is not a size. Pure. */
export function memTokenBytes(token: string): number | null {
  const m = MEM.exec(token);
  if (m === null) return null;
  return Math.round(Number(m[1]) * (UNIT[m[2] ?? ''] ?? 0));
}

/**
 * The LAST sample block in `top -l 2` output: the lines after the final
 * `PID …` header. The first block counts since boot and is discarded.
 * Null when no header line was found at all. Columns are located by the
 * header's own words, so the parse survives a column top declines to print.
 */
export function parseTopSample(stdout: string): PowerSample | null {
  const lines = stdout.split('\n');
  let headerAt = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i]?.trimStart().startsWith('PID')) headerAt = i;
  }
  if (headerAt === -1) return null;
  const header = (lines[headerAt] ?? '').trim().split(/\s+/);
  const cpuCol = header.indexOf('%CPU');
  const powerCol = header.indexOf('POWER');
  const memCol = header.indexOf('MEM');
  const cpuByPid = new Map<number, number>();
  const powerByPid = powerCol === -1 ? null : new Map<number, number>();
  const memBytesByPid = memCol === -1 ? null : new Map<number, number>();
  for (let i = headerAt + 1; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    if (line.trim() === '') continue;
    const cells = line.trim().split(/\s+/);
    const pid = Number(cells[0]);
    if (!Number.isInteger(pid) || pid < 0 || cells[0] === '') break;
    if (cpuCol !== -1) {
      const cpu = Number(cells[cpuCol]);
      if (Number.isFinite(cpu)) cpuByPid.set(pid, cpu);
    }
    if (powerByPid !== null) {
      const power = Number(cells[powerCol]);
      if (Number.isFinite(power)) powerByPid.set(pid, power);
    }
    if (memBytesByPid !== null) {
      const bytes = memTokenBytes(cells[memCol] ?? '');
      if (bytes !== null) memBytesByPid.set(pid, bytes);
    }
  }
  if (cpuByPid.size === 0) return null;
  return { cpuByPid, powerByPid, memBytesByPid };
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
