/**
 * What a failed command says, and where it says it.
 *
 * The failure design in the Phase 22 entry has one rule that decides this
 * file's shape: every failure names the command that produced it, because a
 * hidden subprocess that fails without naming itself is unfixable by the person
 * looking at it. So the failure renders the exact command line that ran and the
 * last lines of its error output, in the same place the confirmation showed
 * that command line before it ran.
 *
 * Success is the exit code, never the text. Only two of this CLI's outputs are
 * ever parsed, and neither of them is the output of a write. So this component
 * is given an exit code and a transcript and it reports both. It never reads
 * the text to decide whether the thing worked.
 */

import React from 'react';
import { commandFailureCopy } from './install-copy';

export interface CommandFailure {
  /** The operation in the user's words, e.g. "install". */
  operation: string;
  /** The full child-process command line, as it was shown before it ran. */
  commandLine: string;
  /** null when the child never started. */
  exitCode: number | null;
  timedOut: boolean;
  /** Last lines of stderr. Trimmed by the caller, rendered verbatim here. */
  stderr: string;
}

export function InstallFailure({
  failure
}: {
  failure: CommandFailure;
}): React.JSX.Element {
  return (
    <div className="ctxd-failure" role="alert">
      <p className="ctxd-error">
        {commandFailureCopy(
          failure.operation,
          failure.exitCode,
          failure.timedOut
        )}
      </p>
      <p className="ctxd-card-label">This is what ran</p>
      <pre className="ctxd-mono ctxd-command-line">{failure.commandLine}</pre>
      {failure.stderr.trim().length > 0 ? (
        <>
          <p className="ctxd-card-label">This is what it said</p>
          <pre className="ctxd-mono ctxd-command-line ctxd-stderr">
            {failure.stderr}
          </pre>
        </>
      ) : null}
      <p className="ctxd-muted">
        Nothing in the panel changed. Tortie re-reads the files after every
        command and shows what is on disk.
      </p>
    </div>
  );
}
