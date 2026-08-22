/**
 * What a person can do about one connection outcome, drawn apart from what
 * happened.
 *
 * PHASE 123. This block used to live in ConnectionTestView.tsx, and
 * KeyInstall.tsx imported it back from there while ConnectionTestView.tsx
 * rendered KeyInstall. That was a runtime import cycle of two modules, and the
 * new graph gate refuses it. Three surfaces draw this block, so it belongs to
 * none of them. Nothing here changed except the file it sits in.
 */

import React from 'react';
import type { MachineTestClass } from '@shared/ipc';
import { REMEDY, REMEDY_LABEL } from './machines-copy';

/**
 * Main names the outcome and this names the next step, and the two are kept
 * visually separate so a person can tell the report from the advice. It is
 * exported because Prepare answers with the same classes and a second copy of
 * this block would be the duplication the growth guardrail forbids.
 *
 * A class with nothing for a person to do draws nothing at all. Advice under
 * an outcome that worked would be noise.
 */
export function Remedy({ cls }: { cls: MachineTestClass }): React.JSX.Element | null {
  const text = REMEDY[cls];
  if (text === null) return null;
  return (
    <div className="mach-remedy" data-remedy-class={cls}>
      <div className="mach-remedy-label">{REMEDY_LABEL}</div>
      <p className="mach-remedy-text">{text}</p>
    </div>
  );
}
