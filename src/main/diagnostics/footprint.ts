/**
 * Physical footprint for processes that cannot answer for themselves
 * (Phase 163).
 *
 * `process.getProcessMemoryInfo` only exists inside a process that runs
 * JavaScript, so main and the renderers answer for themselves and nothing
 * else can: not the GPU process, not a utility, not the session server, not
 * an agent CLI inside a pane. For those the honest number on macOS is the
 * physical footprint, which is what Activity Monitor's Memory column shows
 * and what `/usr/bin/footprint` prints. Measured on 2026-08-29: two pids in
 * 55 ms wall, `top -l 1 -stats mem` agreed byte for byte and walked the whole
 * table to do it.
 *
 * ONE TRAP, found the same day. `footprint -p 1` did not answer for launchd,
 * which this account cannot read, and instead matched a process whose NAME
 * contained "1" ("Found process muse-bin-0.2.1 from partial name 1"). A pid
 * argument is a name argument when the pid cannot be read. So the parser
 * keeps only the pids that were ASKED FOR, read from the `[pid]` in each
 * header line, and drops anything the tool volunteered.
 *
 * The parse half is pure and exported for tests. The run goes through the
 * guarded runner, so it settles inside its deadline whatever the tool does.
 */

import { runGuarded } from '../proc/guarded';

export const FOOTPRINT_BIN = '/usr/bin/footprint';

/** `zsh [94276]: 64-bit    Footprint: 2179384 B (16384 bytes per page)` */
const HEADER = /^.*\[(\d+)\]:.*Footprint:\s+(\d+)\s+B\b/;
/** `    phys_footprint: 2195768 B` */
const PHYS = /^\s*phys_footprint:\s+(\d+)\s+B\b/;

/**
 * pid to physical footprint bytes, for the requested pids only. A pid the
 * tool could not read is absent from the map, never zero.
 */
export function parseFootprint(
  stdout: string,
  requested: ReadonlySet<number>
): Map<number, number> {
  const out = new Map<number, number>();
  let current: number | null = null;
  for (const line of stdout.split('\n')) {
    const header = HEADER.exec(line);
    if (header !== null) {
      const pid = Number(header[1]);
      if (requested.has(pid)) {
        current = pid;
        // The header's Footprint is the dirty plus swapped total; the
        // auxiliary phys_footprint below replaces it when present because
        // that is the kernel's own ledger and the one Activity Monitor shows.
        out.set(pid, Number(header[2]));
      } else {
        current = null;
      }
      continue;
    }
    const phys = PHYS.exec(line);
    if (phys !== null && current !== null) {
      out.set(current, Number(phys[1]));
      current = null;
    }
  }
  return out;
}

/** The argv for one read. Pure, so a test can pin it. */
export function footprintArgs(pids: readonly number[]): string[] {
  const args = ['-f', 'bytes', '--noCategories'];
  for (const pid of pids) args.push('-p', String(pid));
  return args;
}

export interface FootprintDeps {
  /** Injectable for tests. Default: the guarded runner over the real tool. */
  run?(args: readonly string[]): Promise<string>;
}

/**
 * Read the physical footprint of every pid given. One process, one call,
 * bounded at five seconds. An empty map when the tool is missing or the
 * list is empty; never a throw.
 */
export async function readFootprints(
  pids: readonly number[],
  deps: FootprintDeps = {}
): Promise<Map<number, number>> {
  const wanted = new Set<number>();
  for (const pid of pids) if (Number.isInteger(pid) && pid > 0) wanted.add(pid);
  if (wanted.size === 0) return new Map();
  const run =
    deps.run ??
    (async (args: readonly string[]): Promise<string> => {
      const r = await runGuarded(FOOTPRINT_BIN, args, {
        timeoutMs: 5_000,
        maxOutputBytes: 4 * 1024 * 1024
      });
      return r.spawnError === null ? r.stdout : '';
    });
  try {
    return parseFootprint(await run(footprintArgs([...wanted])), wanted);
  } catch {
    return new Map();
  }
}
