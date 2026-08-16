/**
 * The last words of a dead pane (Phase 48, research 47 sections 6 and 7).
 *
 * Three of the seven failure modes research 47 reproduced are an agent that
 * starts and then exits: a flag the CLI rejects, an interpreter older than the
 * package needs, a wrapper missing a login shell variable. No static check can
 * predict any of them. In every one of those cases the pane DOES print the
 * reason, and Tortie destroys the pane about one second later and replaces the
 * text with "Session ended unexpectedly (exit 1)". This module keeps the text.
 *
 * ONE LINE IS REMOVED AND IT IS NOT THE AGENT'S (Phase 48 fix round). tmux
 * writes its own dead pane banner into the grid at the moment of death, and
 * `capture-pane` hands it back as the last line. See {@link DEAD_PANE_BANNER}.
 * Everything that survives that one removal is the pane's own output.
 *
 * It is pure and it is small on purpose. The reaper in ./core.ts is the only
 * caller, and it hands over the pane text the snapshot capture already read,
 * so nothing new is spawned and nothing new is read.
 *
 * WHAT IS NEVER DONE WITH THE RESULT. It is written verbatim into the manifest
 * row, rendered verbatim in a monospace block, and never parsed. No branch
 * anywhere in Tortie reads its content to decide anything. The renderer
 * decides what to draw from `exitCode`, `exitSignal` and the session's own
 * timing, never from these bytes.
 */

import { stripAnsi } from '../ansi';

/**
 * How many non-empty lines are kept.
 *
 * A crash whose useful line is more than five lines above the end will not be
 * shown. The full scrollback is still in the snapshot on disk.
 */
export const EXIT_DETAIL_LINES = 5;

/**
 * The hard cap, in bytes of UTF-8.
 *
 * An unbounded blob of agent output inside a durability critical database is a
 * hazard whatever its typical size, so the cap is enforced here rather than
 * trusted to the shape of the text.
 */
export const EXIT_DETAIL_MAX_BYTES = 500;

/**
 * tmux's own dead pane banner, which the pane did not print.
 *
 * WHY THIS EXISTS. resources/gmux-tmux.conf sets `remain-on-exit failed` and
 * never sets `remain-on-exit-format`, so at the moment a process dies tmux
 * writes its default banner into the pane grid, on the line below whatever the
 * process last wrote. `capture-pane` then returns it as the last non-empty
 * line, and this module used to keep it and hand it to a heading that reads
 * "The last thing it printed was:". Three things were wrong at once. The pane
 * did not print it, so the heading was false. It contains the word "Pane",
 * which the UI rules in CLAUDE.md forbid in user-facing copy. And it repeats
 * the exit code the heading already gives, with a death timestamp in place of
 * a reason. It also consumed one of the five lines and part of the 500 byte
 * cap, which is how a single long error could be dropped whole and replaced by
 * the banner alone.
 *
 * THE SHAPE, measured rather than assumed. tmux 3.6a's default
 * `remain-on-exit-format` is
 * `Pane is dead (#{?...,status #{pane_dead_status},}#{?...,signal
 * #{pane_dead_signal},}, #{t:pane_dead_time})`, and the two forms it produces
 * were captured on this machine as `Pane is dead (status 127, Sat Aug 15
 * 21:11:05 2026)` and `Pane is dead (signal kill, Sat Aug 15 21:11:50 2026)`.
 *
 * WHAT IS NOT COVERED. A person who sets their own `remain-on-exit-format` on
 * the private server gets their own banner kept, exactly as before. Tortie
 * does not set the option, so it cannot recognise every value of it.
 */
const DEAD_PANE_BANNER = /^Pane is dead(?: \(.*\))?$/;

/** Bytes of UTF-8 in a string. */
function byteLength(text: string): number {
  return Buffer.byteLength(text, 'utf8');
}

/**
 * The last `max` bytes of `text`, starting on a code point boundary.
 *
 * Slicing bytes can land inside a multi byte character, so the start moves
 * forward over continuation bytes (`10xxxxxx`) until it is on a real
 * boundary. The result is therefore at most `max` bytes and never contains a
 * replacement character.
 */
function tailBytes(text: string, max: number): string {
  const buf = Buffer.from(text, 'utf8');
  if (buf.length <= max) return text;
  let start = buf.length - max;
  while (start < buf.length && (buf[start]! & 0xc0) === 0x80) start++;
  return buf.subarray(start).toString('utf8');
}

/** The last five non-empty lines of a dead pane, ANSI stripped, 500 bytes. */
export function exitDetailFrom(paneText: string): string | undefined {
  const lines = stripAnsi(paneText)
    .split('\n')
    .map((line) => line.replace(/\r/g, '').trimEnd())
    .filter((line) => line.length > 0);

  // tmux's banner comes off BEFORE the slice and before the cap, so it costs
  // neither one of the five lines nor any of the 500 bytes. One line only, and
  // only the last one: tmux writes exactly one and writes it last.
  const last = lines[lines.length - 1];
  if (last !== undefined && DEAD_PANE_BANNER.test(last.trimStart())) {
    lines.pop();
  }
  // A pane that printed nothing of its own now returns undefined, which is the
  // NULL the schema comment always claimed for it. Before the drop above this
  // was unreachable, because the banner alone was kept and the renderer drew a
  // monospace block under a heading with nothing in it that the agent said.
  if (lines.length === 0) return undefined;

  let kept = lines.slice(-EXIT_DETAIL_LINES);
  // Whole lines come off the FRONT, because the end of the output is the part
  // that says why the process stopped.
  while (kept.length > 1 && byteLength(kept.join('\n')) > EXIT_DETAIL_MAX_BYTES) {
    kept = kept.slice(1);
  }
  if (kept.length === 0) return undefined;

  const joined = kept.join('\n');
  return byteLength(joined) <= EXIT_DETAIL_MAX_BYTES
    ? joined
    : tailBytes(joined, EXIT_DETAIL_MAX_BYTES);
}
