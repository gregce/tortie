/**
 * Where the install surfaces are actually mounted.
 *
 * It sits beside the app's other modals in `App.tsx` rather than inside the
 * Context view, and that is not a preference. `.sidebar-rest` is an
 * `overflow: auto` scroller, so a modal scrim rendered inside it would be
 * clipped to a 220px column. The verbs are raised from the sidebar through the
 * install store, and the surfaces are drawn here at the top of the tree.
 *
 * Two components, in the order a user meets them:
 *
 *  - `InstallSheet` — find a skill, read it, see what runs, choose the agents.
 *  - `InstallDialog` — the confirm, with the whole command line, and the place
 *    a failure is reported afterwards under that same command line.
 *
 * The confirm is a SECOND surface rather than a footer on the first, because
 * requirement 3 says nothing installs without a human confirming and the
 * confirm shows the full command line. A primary button that both approved and
 * ran would make the confirm a property of a click handler; two surfaces make
 * it the only route.
 */

import React from 'react';
import { useInstallFlow } from './install-store';
import { InstallDialog } from './InstallDialog';
import { InstallSheet } from './InstallSheet';

export function ContextInstallHost(): React.JSX.Element {
  const confirm = useInstallFlow((s) => s.confirm);
  const cancelConfirm = useInstallFlow((s) => s.cancelConfirm);
  const runConfirmed = useInstallFlow((s) => s.runConfirmed);

  return (
    <>
      <InstallSheet />
      <InstallDialog
        spec={confirm}
        onConfirm={() => void runConfirmed()}
        onCancel={cancelConfirm}
        onCopyCommand={(text) => void navigator.clipboard.writeText(text)}
      />
    </>
  );
}
