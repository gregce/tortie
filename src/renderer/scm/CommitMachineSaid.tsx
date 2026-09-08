/**
 * PHASE 229. git's own words after a failed commit on a machine, behind a
 * disclosure.
 *
 * Research 88 section 4.5 read the parent: a `<pre>` of thirteen lines
 * beginning "Author identity unknown", visible on the resting face of the
 * Source control view, inside no disclosure. That is machinery on the surface.
 * Tortie's own sentence about what happened, composed in main, stays on the
 * face; what this holds is the machine's raw stderr, and it is drawn only
 * while a person has asked for it, the way `CloneRepoModal` on this Mac keeps
 * git's text behind Show details. The two labels are that dialog's own words,
 * from `remoteCommitDetailsToggle`, so the remote face carries nothing the
 * local one does not.
 *
 * PURE. The state lives in the commit box, which closes it again whenever a
 * new answer replaces the words, so a person never reads the last commit's
 * stderr under the next commit's sentence. The `<pre>` is in the DOM only
 * while open, so a reading of the face finds it only after a press.
 */

import React from 'react';
import { remoteCommitDetailsToggle } from '../machines/scm';

export function CommitMachineSaid({
  text,
  open,
  onToggle
}: {
  text: string;
  open: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <>
      <button
        type="button"
        className="btn-text scm-remote-commit-details-toggle"
        data-scm-commit-details="1"
        aria-expanded={open}
        onClick={onToggle}
      >
        {remoteCommitDetailsToggle(open)}
      </button>
      {open ? (
        <pre className="scm-remote-commit-said" data-scm-commit-said="1">
          {text}
        </pre>
      ) : null}
    </>
  );
}
