/**
 * clamp.mts. For `probe:p320`'s C1 (Phase 320.1's second build, build/p3201/SPEC.md
 * D13): the SHIPPING `clampHistoryRange` of src/main/tmux/scroll.ts, asked once
 * with the range and the extent in `P320_CLAMP_IN` (JSON `{ range, extent }`),
 * its answer printed as one JSON line. The probe is plain node and cannot import
 * TypeScript, so it runs this through the pinned tsx (build/ts-runner.mjs) and
 * derives the rows a copy must hold from the clamp that ships, not from a copy of
 * its arithmetic. It reads nothing else, writes nothing, and starts nothing.
 */
import { clampHistoryRange } from '../../src/main/tmux/scroll.ts';

const input = JSON.parse(process.env['P320_CLAMP_IN'] ?? 'null') as {
  range: { start: number; end: number };
  extent: { history: number; rows: number };
} | null;
if (input === null) {
  process.stderr.write('clamp.mts: P320_CLAMP_IN is not set\n');
  process.exit(2);
}
process.stdout.write(`${JSON.stringify(clampHistoryRange(input.range, input.extent))}\n`);
