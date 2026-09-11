/**
 * The ONE place the wrapper pass setting is read (Phase 257, spec D5).
 *
 * `ArchSettings.wrapperPass` decides whether the fact pass asks the worker
 * pool for wrapper declarations and closes the one hop map over them. It is
 * off by default because research 118 §6.3 measured the pass at 3.15× the
 * whole read on this repository and at 1.57× to 1.83× on four repositories
 * where it finds nothing. It is NOT sealed: it decides what one existing
 * worker pool parses, never what runs, the same posture as `enabled`.
 *
 * No control draws it in this phase. Phase 258 draws the row when there is a
 * face on which its effect can be seen; until then it is a hand editable key
 * in `settings.json`, and `conformance:facts` rule 12 proves that only a
 * literal `true` turns it on and that this module is its only reader.
 */

import type { ArchSettings } from '@shared/settings';

export function wrapperPassOn(arch: ArchSettings): boolean {
  return arch.wrapperPass === true;
}
