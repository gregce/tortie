/**
 * One button that copies a line of text, shared by the settings surfaces.
 *
 * PHASE 79. These lines lived inside AgentsSection.tsx, where the agent scan
 * draws the install command for an agent that is not on this Mac. The machines
 * surface needed the same control beside the Tailscale install command, and
 * the growth guardrail in CLAUDE.md forbids a second copy of a block this
 * size, so the component moved here unchanged and both surfaces import it.
 *
 * Nothing about the behaviour changed in the move. The button writes the text
 * to the clipboard, shows a tick for a moment, and goes back to the copy icon.
 * It runs nothing and it stores nothing.
 */

import React, { useState } from 'react';
import { Codicon } from '../icons';

export function CopyButton({ text, label }: { text: string; label: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="icon-btn set-copy"
      aria-label={label}
      title={copied ? 'Copied' : label}
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      <Codicon name={copied ? 'check' : 'copy'} size={12} />
    </button>
  );
}
