// A fixture for build/conformance-diagnostic.mjs (Phase 364): rule D2, proved
// before it reads the tree. The gate reads this file as if it were
// src/main/diagnostic-fixture/ts-flag.ts. Every line marked @red must be named
// by D2, and no other: DIAGNOSTIC_BUILD is read only as the whole test of an
// `if` with no else, and the checker's and the events' exports are called only
// inside such an `if`'s consequent. It is never compiled.
import { DIAGNOSTIC_BUILD } from '../diagnostic-build/flag';
import { armChecker } from '../diagnostic-build/checker';
import { diagnosticEvent } from '../diagnostic-build/events';
import type { diagnosticEvent as EventFn } from '../diagnostic-build/events';

export type Fn = typeof EventFn;

export function fine(on: (cb: () => void) => void): void {
  if (DIAGNOSTIC_BUILD) armChecker();
  if (DIAGNOSTIC_BUILD) {
    diagnosticEvent('door', 'open', { generation: 1 });
  }
  if (DIAGNOSTIC_BUILD) on(() => diagnosticEvent('watcher', 'exit', { code: 0 }));
  on(() => {
    if (DIAGNOSTIC_BUILD) diagnosticEvent('terminal', 'spawn', { pid: 1 });
  });
  // A comment is never a read: DIAGNOSTIC_BUILD ? armChecker() : 0
}

export function red(): unknown[] {
  if (DIAGNOSTIC_BUILD) armChecker(); else void 0; // @red
  if (!DIAGNOSTIC_BUILD) void 0; // @red
  const a = DIAGNOSTIC_BUILD ? 1 : 0; // @red
  const b = DIAGNOSTIC_BUILD && armChecker(); // @red
  void String(DIAGNOSTIC_BUILD); // @red
  if (DIAGNOSTIC_BUILD === true) void 0; // @red
  armChecker(); // @red
  const c = { DIAGNOSTIC_BUILD }; // @red
  const d = diagnosticEvent; // @red
  if (DIAGNOSTIC_BUILD || a > 0) void 0; // @red
  if ((DIAGNOSTIC_BUILD)) void 0; // @red
  return [a, b, c, d];
}

export function earlyReturn(): boolean {
  return DIAGNOSTIC_BUILD; // @red
}

export { DIAGNOSTIC_BUILD as again }; // @red
