/**
 * The glance strip (Phase 168): the summary before the detail.
 *
 * The operator asked for the total memory, CPU and battery of all of Tortie
 * at the top, at a glance, and then the granular breakdowns. The two tables
 * keep their own totals and are still never added together anywhere else;
 * the strip's Together column is the ONE place the sum is drawn, and it is
 * honest there because it says what it sums.
 *
 * Memory repeats the tables' own totals. CPU is read from one `top` sample
 * taken inside the capture window (./power.ts), because that is the one
 * ruler that covers Tortie's processes and the agents' alike; when top
 * could not answer the figure is null and the face says not read, never
 * zero. The energy figure is top's power score summed over every Tortie and
 * agent process, or null when the column is unavailable.
 *
 * Pure over its input, so the unit test drives every branch.
 */

import type {
  DiagnosticsGlance,
  DiagnosticsGlanceColumn,
  DiagnosticsTotals
} from '@shared/ipc';

export interface GlanceInput {
  /** The Tortie table's own total, strays excluded. */
  shellTotal: DiagnosticsTotals;
  /** The sessions table's own total. */
  sessionsTotal: DiagnosticsTotals;
  /** The pids behind `shellTotal`, for the CPU and power sums. */
  shellPids: readonly number[];
  /** The pids behind `sessionsTotal`. */
  agentPids: readonly number[];
  /** From ./power.ts, or null when top could not answer. */
  cpuByPid: ReadonlyMap<number, number> | null;
  /** From ./power.ts, or null when the POWER column is unavailable. */
  powerByPid: ReadonlyMap<number, number> | null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function sumOver(
  pids: readonly number[],
  byPid: ReadonlyMap<number, number>
): number {
  let sum = 0;
  for (const pid of pids) sum += byPid.get(pid) ?? 0;
  return round1(sum);
}

export function buildGlance(input: GlanceInput): DiagnosticsGlance {
  const cpu = (pids: readonly number[]): number | null =>
    input.cpuByPid === null ? null : sumOver(pids, input.cpuByPid);
  const tortie: DiagnosticsGlanceColumn = {
    processCount: input.shellTotal.processCount,
    privateBytes: input.shellTotal.privateBytes,
    rssBytes: input.shellTotal.rssBytes,
    cpuPercent: cpu(input.shellPids)
  };
  const agents: DiagnosticsGlanceColumn = {
    processCount: input.sessionsTotal.processCount,
    privateBytes: input.sessionsTotal.privateBytes,
    rssBytes: input.sessionsTotal.rssBytes,
    cpuPercent: cpu(input.agentPids)
  };
  const together: DiagnosticsGlanceColumn = {
    processCount: tortie.processCount + agents.processCount,
    privateBytes: tortie.privateBytes + agents.privateBytes,
    rssBytes: tortie.rssBytes + agents.rssBytes,
    cpuPercent:
      tortie.cpuPercent === null || agents.cpuPercent === null
        ? null
        : round1(tortie.cpuPercent + agents.cpuPercent)
  };
  const energyImpact =
    input.powerByPid === null
      ? null
      : round1(
          sumOver(input.shellPids, input.powerByPid) +
            sumOver(input.agentPids, input.powerByPid)
        );
  return { tortie, agents, together, energyImpact };
}
