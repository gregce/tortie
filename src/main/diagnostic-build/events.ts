/**
 * The diagnostic build's process events (Phase 364, build/p364/SPEC.md D9).
 *
 * When the page-cache checker writes its one line (D6), the lines around it in
 * app.log should say what main was doing near it. So, in the diagnostic build
 * only, one `info` record per watcher request and watcher process start, exit
 * and restart, per terminal spawn and exit, and per door process start, open
 * and stop: the native-adjacent work research 143 §3 names as suspects, and
 * the door's process lifecycle.
 *
 * WHAT A RECORD CARRIES. Numbers and short words the call site already holds:
 * a pid, a generation, an op, a request id, an exit code or a signal. Never an
 * argv, a peer address, a query or a body. A path that does reach a field is
 * redacted by logEvent like every other line (the home folder becomes `~`).
 *
 * Every call sits inside `if (DIAGNOSTIC_BUILD) { … }` (./flag.ts), so the
 * normal build holds none of this module.
 */

import { logEvent } from '../log';

/**
 * One record: scope `diagnostic`, event `diagnostic.<kind>`, message
 * `<kind> <what>`, and the fields with `what` beside them. `what` is written
 * last, so a field can never relabel the record it rides in. Never throws,
 * because logEvent never does.
 */
export function diagnosticEvent(
  kind: 'watcher' | 'terminal' | 'door',
  what: string,
  fields: Record<string, number | string>
): void {
  logEvent('diagnostic', 'info', `diagnostic.${kind}`, `${kind} ${what}`, {
    ...fields,
    what
  });
}
