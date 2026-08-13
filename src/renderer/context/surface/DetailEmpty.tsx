/**
 * What sits under the header card when there is no renderer for the artifact's
 * own content (research 29 §11).
 *
 * Two states, and neither of them is an error state. A hook whose handler is an
 * MCP tool has no file to show. A plugin's content is the things it contributes,
 * each of which is its own row elsewhere in the view. Saying so in one line is
 * more honest than an empty pane, and one bad or missing file must never blank
 * the panel.
 */

import React from 'react';
import type { ContextEntry } from '../model';

export function ContextDetailEmpty({
  entry
}: {
  entry: ContextEntry;
}): React.JSX.Element {
  const line =
    entry.state === 'broken'
      ? 'Tortie could not read this file. Open it to see what is wrong with it.'
      : 'Open the file to read it.';
  return <p className="ctxd-detail-empty ctxd-muted">{line}</p>;
}
