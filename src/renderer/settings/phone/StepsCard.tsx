/**
 * Settings then Phone's three steps, drawn: the FRAME of each (Phase 333.1,
 * build/p3331/SPEC.md §5.4.1, D19, D28).
 *
 * A step is its number, its title, where it stands on the right, and a body
 * slot the sheet fills. A step that is done shows the codicon `check` in
 * `--success` in place of its number; the current step's number is
 * `--accent`; a step not reached yet is `--text-muted`. The number and the
 * check are drawn for the eye (`aria-hidden`): the state words on the right
 * are what a screen reader reads.
 *
 * The number is the step's place in the list, drawn from its position. Nothing
 * here imports PhoneSection.tsx, and nothing here decides: the faces are
 * `checklistOf`'s, and the bodies are the sheet's.
 *
 * WHY NOT `phone/Steps.tsx`, the name the SPEC gave this file (D19). It would
 * sit beside `phone/steps.ts`, and on a case-insensitive volume (his Mac's)
 * the two cannot both be built: `./phone/Steps` is tried as `Steps.ts` first
 * and finds the composer (TS1149), TypeScript's project leaves a `.tsx` out of
 * its file list when a `.ts` of the same folded name is in it (TS6307), and
 * their two declaration files are one path (TS5056). Measured on 2026-10-07
 * with this repository's own tsc, each of the three twice.
 */

import type React from 'react';
import { Codicon } from '../../icons';
import type { StepFace } from './steps';

export interface StepsCardProps {
  readonly faces: readonly StepFace[];
  /** What a step's body draws, filled by the sheet from the face's pieces. */
  body(face: StepFace): React.ReactNode;
}

export function StepsCard({ faces, body }: StepsCardProps): React.JSX.Element {
  return (
    <div className="set-card phone-steps">
      {faces.map((face, i) => (
        <div
          key={face.id}
          className="phone-step"
          data-phone-step={face.id}
          data-phone-step-state={face.stateKey ?? ''}
          data-done={face.done ? 'true' : undefined}
          data-current={face.current ? 'true' : undefined}
        >
          <div className="phone-step-head">
            {face.done ? (
              <Codicon name="check" className="phone-step-mark phone-step-done" />
            ) : (
              <span className="phone-step-mark phone-step-num" aria-hidden="true">
                {String(i + 1)}
              </span>
            )}
            <span className="phone-step-title">{face.title}</span>
            {face.state === null ? null : (
              <span className="phone-step-state" title={face.hover ?? undefined}>
                {face.state}
              </span>
            )}
          </div>
          <div className="phone-step-body">{body(face)}</div>
        </div>
      ))}
    </div>
  );
}
