/**
 * Phase 110. Settings → Agents → "On your other machines".
 *
 * What these tests hold:
 * - A person with no machine sees nothing at all, and so does a build whose
 *   preload has no machines surface. Not a heading, not a caption, not a card.
 * - One block per machine, in file order, each carrying its own machine id.
 * - A present row draws the absolute path THAT MACHINE stated, and never a
 *   tilde. This is the `displayPath` rule and it is the one that would regress
 *   silently, because a tilde is a claim about whose home folder a path is in.
 * - The three presences read as three different sentences, and only `present`
 *   draws a path.
 * - A machine nobody has asked draws the sentence that says so and zero rows.
 * - NO INSTALL SURFACE, asserted on markup rather than remembered. The panel
 *   composes every row with `install: null`, so no command and no copy control
 *   can reach it even for an agent whose registry entry publishes one.
 * - A machine Tortie cannot ask keeps its rows and its age, and its button is
 *   off with the reason on it.
 * - A rescan disables its own button and nobody else's, and a failed rescan
 *   flips no row.
 *
 * The vitest environment is node, so these read static markup from
 * react-dom/server. They render `MachineAgentsPanel` rather than
 * `MachineAgentsSection`, because zustand serves its INITIAL state to a server
 * render: a test that seeded the stores and rendered the connected component
 * would read defaults and assert nothing at all. `machines-section.test.tsx`
 * carries the same note for the same reason.
 */

import type React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { MachineAgentsView, MachineRowView } from '@shared/ipc';
import type { AgentsScanResult } from '@shared/types';
import { MachineAgentsPanel } from '../MachineAgents';
import {
  AGENTS_NEVER_ASKED,
  AGENTS_NOT_SIGNED_IN,
  AGENTS_ON_MACHINES_CAPTION,
  AGENT_ABSENT,
  AGENT_UNKNOWN,
  RESCAN_AGENTS_RUNNING,
  agentsAskedLine
} from '../machines-copy';

/** A fixed clock, so the age sentences are exact rather than approximate. */
const NOW = Date.UTC(2026, 7, 20, 12, 0, 0);
const FOUR_MINUTES_AGO = NOW - 4 * 60_000;
const HALF_A_MINUTE_AGO = NOW - 30_000;

function row(over: Partial<MachineRowView> = {}): MachineRowView {
  return {
    id: 'studio',
    label: 'Studio',
    color: 'blue',
    host: 'studio.local',
    user: 'gdc',
    port: null,
    remoteTmuxPath: null,
    state: 'confirmed',
    usable: true,
    hash: 'a1b2c3d4',
    confirmedHash: 'a1b2c3d4',
    confirmedAt: FOUR_MINUTES_AGO,
    confirmedLines: [],
    lines: [],
    refusal: null,
    warning: 'the warning main owns',
    ready: true,
    ...over
  };
}

function view(over: Partial<MachineAgentsView> = {}): MachineAgentsView {
  return {
    machineId: 'studio',
    askedAt: FOUR_MINUTES_AGO,
    agents: [
      {
        agentId: 'claude',
        presence: 'present',
        path: '/Users/gdc/.local/bin/claude'
      },
      { agentId: 'codex', presence: 'absent', path: null },
      { agentId: 'gemini', presence: 'unknown', path: null }
    ],
    ...over
  };
}

/**
 * This Mac's own scan. `codex` carries the install command a provider
 * publishes, so the no install surface test has something that could leak.
 */
const SCAN: AgentsScanResult = {
  scannedAt: FOUR_MINUTES_AGO,
  agents: [
    {
      id: 'claude',
      displayName: 'Claude Code',
      kind: 'cli',
      launchable: true,
      installed: true,
      binPath: '/Users/gdc/.local/bin/claude',
      version: '2.1.4',
      storeDetected: true,
      iconKey: 'claude',
      unverified: false,
      install: {
        command: 'curl -fsSL https://claude.ai/install.sh | bash',
        docUrl: 'https://docs.claude.com/install',
        readOn: '2026-08-15',
        canonicalIsPackageManager: false
      }
    },
    {
      id: 'codex',
      displayName: 'Codex CLI',
      kind: 'cli',
      launchable: true,
      installed: false,
      binPath: null,
      version: null,
      storeDetected: false,
      iconKey: 'codex',
      unverified: false,
      install: {
        command: 'npm install -g @openai/codex',
        docUrl: 'https://developers.openai.com/codex',
        readOn: '2026-08-15',
        canonicalIsPackageManager: true
      }
    },
    {
      id: 'gemini',
      displayName: 'Gemini CLI',
      kind: 'cli',
      launchable: true,
      installed: false,
      binPath: null,
      version: null,
      storeDetected: false,
      iconKey: 'gemini',
      unverified: false,
      install: null
    }
  ]
};

function draw(
  over: Partial<React.ComponentProps<typeof MachineAgentsPanel>> = {}
): string {
  return renderToStaticMarkup(
    <MachineAgentsPanel
      rows={[row()]}
      supported
      views={{ studio: view() }}
      scan={SCAN}
      rescanning={{}}
      errors={{}}
      nowMs={NOW}
      onRescan={() => undefined}
      {...over}
    />
  );
}

describe('the panel draws nothing at all when there is nothing to say', () => {
  it('draws nothing for a person who has added no machine', () => {
    expect(draw({ rows: [], views: {} })).toBe('');
  });

  it('draws nothing for a build whose preload has no machines surface', () => {
    expect(draw({ supported: false })).toBe('');
  });
});

describe('one block per machine', () => {
  it('draws the caption and one card per machine in file order', () => {
    const html = draw({
      rows: [row(), row({ id: 'pop', label: 'Pop', host: 'pop.local' })],
      views: { studio: view(), pop: view({ machineId: 'pop' }) }
    });
    // Phase 129 deleted the heading. Each machine has its own page now and
    // the page's tab names it, so a heading above the card said it twice.
    expect(html).not.toContain('On your other machines');
    expect(html).not.toContain('set-group-label');
    expect(html).toContain(AGENTS_ON_MACHINES_CAPTION);
    expect(html.indexOf('data-machine-id="studio"')).toBeGreaterThan(-1);
    expect(html.indexOf('data-machine-id="pop"')).toBeGreaterThan(
      html.indexOf('data-machine-id="studio"')
    );
    expect(html.match(/class="set-card mach-agents"/g)).toHaveLength(2);
  });

  it('draws each machine’s own name, address and id', () => {
    const html = draw();
    expect(html).toContain('Studio');
    expect(html).toContain('studio.local');
    expect(html).toContain('>studio<');
  });
});

describe('the path is the machine’s own, and never this Mac’s', () => {
  it('draws the absolute path exactly as that machine stated it', () => {
    const html = draw();
    // The rule: `displayPath` rewrites /Users/<someone>/… to ~/… for THIS Mac
    // only. A path read from another machine is drawn whole, because a tilde
    // says whose home folder it is and Tortie does not know that over there.
    expect(html).toContain('/Users/gdc/.local/bin/claude');
    expect(html).not.toContain('~/.local/bin/claude');
  });

  it('draws no path for a row that was not found and none for an unknown one', () => {
    const html = draw({
      views: {
        studio: view({
          agents: [
            { agentId: 'codex', presence: 'absent', path: null },
            { agentId: 'gemini', presence: 'unknown', path: null }
          ]
        })
      }
    });
    expect(html).toContain(AGENT_ABSENT);
    expect(html).toContain(AGENT_UNKNOWN);
    expect(html).not.toContain('set-agent-path');
  });

  it('reads Not found for absent and Not known yet for unknown', () => {
    const html = draw();
    expect(html).toContain(AGENT_ABSENT);
    expect(html).toContain(AGENT_UNKNOWN);
    // The two must never read as each other. An unknown row that read as
    // absent would claim a machine answered a question nobody asked it.
    expect(html).not.toContain('Not installed');
  });

  it('names an agent from this Mac’s scan, and falls back to the id', () => {
    expect(draw()).toContain('Claude Code');
    expect(draw({ scan: null })).toContain('claude');
    expect(draw({ scan: null })).not.toContain('Claude Code');
  });
});

describe('the age sentence, because this panel never asks on its own', () => {
  it('says how long ago that machine answered', () => {
    expect(draw()).toContain(agentsAskedLine('4m'));
  });

  it('says less than a minute ago at the boundary', () => {
    expect(draw({ views: { studio: view({ askedAt: HALF_A_MINUTE_AGO }) } })).toContain(
      agentsAskedLine('now')
    );
  });

  it('says nothing is known about a machine nobody has asked, and lists no row', () => {
    const html = draw({ views: { studio: view({ askedAt: null, agents: [] }) } });
    expect(html).toContain(AGENTS_NEVER_ASKED);
    expect(html).not.toContain('set-agent-row');
  });

  it('lists no row for a machine that is not in the answer map at all', () => {
    const html = draw({ views: {} });
    expect(html).toContain(AGENTS_NEVER_ASKED);
    expect(html).not.toContain('set-agent-row');
  });
});

describe('no install surface, and it is a refusal rather than a scope note', () => {
  it('draws no install command, no copy control and no provider page', () => {
    // Every row here is composed from an agent whose registry entry publishes
    // an install command, and one of those commands is a piped shell one
    // liner. The panel sets `install: null` on every row it composes, so none
    // of it can reach the screen beside a machine Tortie can talk to.
    const html = draw();
    expect(html).not.toContain('set-agent-cmd');
    expect(html).not.toContain('set-copy');
    expect(html).not.toContain('curl ');
    expect(html).not.toContain('npm install');
    expect(html).not.toContain('https://');
  });

  it('draws no version chip and no in use mark, because it asked neither', () => {
    const html = draw();
    expect(html).not.toContain('2.1.4');
    expect(html).not.toContain('set-agent-inuse');
  });
});

describe('the Rescan button', () => {
  it('is off for a machine Tortie has not signed in to, and says why', () => {
    const html = draw({ rows: [row({ ready: false })] });
    expect(html).toContain('disabled');
    expect(html).toContain('Studio (not signed in)');
    expect(html).toContain(AGENTS_NOT_SIGNED_IN);
    // Nothing is taken away. The rows and the age stay exactly as they were.
    expect(html).toContain('/Users/gdc/.local/bin/claude');
    expect(html).toContain(agentsAskedLine('4m'));
  });

  it('carries a label naming its own machine, because up to 32 read Rescan', () => {
    expect(draw()).toContain('Ask Studio which agents it has');
  });

  it('disables the machine it is running for and no other', () => {
    const html = draw({
      rows: [row(), row({ id: 'pop', label: 'Pop', host: 'pop.local' })],
      views: { studio: view(), pop: view({ machineId: 'pop' }) },
      rescanning: { studio: true }
    });
    expect(html).toContain(RESCAN_AGENTS_RUNNING);
    expect(html).toContain('set-spinner');
    expect(html.match(/disabled/g)).toHaveLength(1);
  });
});

describe('a rescan that failed', () => {
  it('draws main’s sentence and flips no row', () => {
    const html = draw({ errors: { studio: 'That machine did not answer.' } });
    expect(html).toContain('That machine did not answer.');
    expect(html).toContain('set-row-error');
    // The answer is untouched, which is the phase's one correctness rule on
    // this side. A read that failed is not evidence that an agent is absent.
    expect(html).toContain('/Users/gdc/.local/bin/claude');
    expect(html).toContain(agentsAskedLine('4m'));
  });

  it('draws no error block for a machine nothing failed on', () => {
    expect(draw()).not.toContain('set-row-error');
  });
});

describe('one page draws one machine (Phase 129)', () => {
  it('draws only the named machine when a page asks for one', () => {
    const html = draw({
      machineId: 'pop',
      rows: [row(), row({ id: 'pop', label: 'Pop', host: 'pop.local' })],
      views: { studio: view(), pop: view({ machineId: 'pop' }) }
    });
    expect(html).toContain('data-machine-id="pop"');
    expect(html).not.toContain('data-machine-id="studio"');
    expect(html.match(/class="set-card mach-agents"/g)).toHaveLength(1);
  });

  it('keeps the caption on a machine page, so the age sentence has its frame', () => {
    expect(draw({ machineId: 'studio' })).toContain(AGENTS_ON_MACHINES_CAPTION);
  });

  it('draws nothing for a page whose machine has left the file', () => {
    // `AgentsSection` puts the person back on This Mac in the same render, so
    // an empty page is a frame rather than a state anybody reads.
    expect(draw({ machineId: 'gone' })).toBe('');
  });

  it('draws every machine when no page is named, which is the old shape', () => {
    const html = draw({
      rows: [row(), row({ id: 'pop', label: 'Pop', host: 'pop.local' })],
      views: { studio: view(), pop: view({ machineId: 'pop' }) }
    });
    expect(html.match(/class="set-card mach-agents"/g)).toHaveLength(2);
  });
});
