/**
 * The ONE ANSI stripper in the main process.
 *
 * Three copies used to exist and one of them was materially weaker: restore's
 * (CSI + OSC + two-byte ESC), a verbatim clone of it in the conformance
 * reporter, and `agents/detection.ts`'s single-regex version, which had no OSC
 * branch and omitted `:` from the CSI parameter class. Both of the first two
 * were exported as `stripAnsi`, so which behaviour an import site got depended
 * on which module it imported from (research 25 §3 B1).
 *
 * That divergence had a consequence: colon-separated SGR (`\x1b[38:2:255:0:0m`,
 * valid ITU-T T.416 and emitted by several TUI toolkits) and OSC title
 * sequences survived detection's stripper, so `extractVersion()` could return
 * escape residue — and that string is the `helpVerifiedVersion` comparand and
 * the text shown in Settings → Agents.
 *
 * The strictest implementation wins, because "strip ANSI" has one correct
 * answer and the weaker copy was simply wrong. Kept dependency-free (no
 * electron, no node builtins) so every caller — main, workers, the conformance
 * harness — can reach it without pulling a domain in behind it.
 */

/** CSI sequences (colors, cursor) — enough for `capture-pane -e` output. */
// eslint-disable-next-line no-control-regex
const CSI_RE = /\x1b\[[0-9;:?]*[ -/]*[@-~]/g;
/** OSC sequences (titles, hyperlinks), BEL- or ST-terminated. */
// eslint-disable-next-line no-control-regex
const OSC_RE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
/** Bare two-byte C1 escapes (index, reverse index, ST leftovers). */
// eslint-disable-next-line no-control-regex
const ESC2_RE = /\x1b[@-_]/g;

/**
 * Strip ANSI escape sequences for plain-text assertions (smoke harness),
 * blank-line detection, version extraction and token matching.
 *
 * OSC first: its payload may contain bytes the CSI pass would otherwise chew
 * through, and its ST terminator (`ESC \`) is a two-byte escape the last pass
 * would eat out from under it.
 */
export function stripAnsi(text: string): string {
  return text.replace(OSC_RE, '').replace(CSI_RE, '').replace(ESC2_RE, '');
}
