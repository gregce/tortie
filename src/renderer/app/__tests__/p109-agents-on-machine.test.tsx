/**
 * Phase 109 — which agents the machine you are creating on actually has, as
 * the two surfaces draw it.
 *
 * WHAT THESE CASES HOLD.
 *  - The AGENT_NOT_ON_MACHINE launch block draws the machine's LABEL, main's
 *    own sentence, and exactly one action, which is never `Try again` and
 *    never an install command. `Try again` rescans this Mac, and the install
 *    command Tortie holds was read for this Mac; both would answer a question
 *    about the wrong computer.
 *  - The empty state's caption for a greyed tile on a machine tab is one
 *    sentence with NO command, even when the local scan row carries one.
 *  - A greyed tile's aria label on a machine tab names the machine.
 *  - The sentence under the board names the machine and is pinned here.
 *
 * The environment is node, so everything is read as static markup, the
 * create-machine-ready precedent. The action's wiring (it asks the machine
 * and not this Mac) is in create-options.test.ts beside the sheet's other
 * pure helpers, and the live proof is the verifier's item 3.
 */

import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AgentPickerOption } from '../../state/agents';

// The modal's module graph reaches the app store, whose slices read
// `window.gmux` while the store object is being created.
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = {
    gmux: undefined,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout,
    clearTimeout
  };
});

import {
  agentMissingOnMachine,
  agentNotOnMachineAria,
  agentNotOnMachineTitle,
  agentsAbsentHint,
  askMachineAgainLabel
} from '../machine-copy';
import { AgentGrid } from '../AgentGrid';
import { AgentNotOnMachineBlock } from '../CreateSessionModal';
import { HintedInstallCaption } from '../EmptyStates';

function option(over: Partial<AgentPickerOption>): AgentPickerOption {
  return {
    id: 'claude',
    label: 'Claude Code',
    iconKey: 'claude',
    installed: true,
    unverified: false,
    configState: null,
    install: null,
    ...over
  } as AgentPickerOption;
}

/** Main's own refusal sentence, the shape noRemoteProgramRefusal composes. */
const MESSAGE =
  'Tortie could not find claude on Studio. It looked in 17 folders, being ' +
  'the ones that machine lists for programs and the ones programs are ' +
  'usually kept in. Nothing was started there. Install it on Studio, or ' +
  'start the session on a machine that has it.';

describe('the AGENT_NOT_ON_MACHINE launch block', () => {
  const html = renderToStaticMarkup(
    <AgentNotOnMachineBlock
      agentLabel="Claude Code"
      refusal={{
        agentId: 'claude',
        message: MESSAGE,
        machineId: 'm-studio',
        machineLabel: 'Studio'
      }}
      busy={false}
      onAskAgain={() => {}}
    />
  );

  it('draws the heading with the machine label, not its id', () => {
    expect(agentNotOnMachineTitle('Claude Code', 'Studio')).toBe(
      'Claude Code was not found on Studio'
    );
    expect(html).toContain('Claude Code was not found on Studio');
    expect(html).not.toContain('m-studio');
  });

  it('draws main&apos;s own sentence as the body', () => {
    expect(html).toContain('It looked in 17 folders');
  });

  it('offers one action, and it is not Try again', () => {
    expect(askMachineAgainLabel('Studio')).toBe('Ask Studio again');
    expect(html).toContain('Ask Studio again');
    expect(html).not.toContain('Try again');
    expect(html.match(/<button/g)).toHaveLength(1);
  });

  it('offers no install command anywhere in the block', () => {
    expect(html).not.toContain('<code');
    expect(html).not.toContain('install ');
    expect(html.toLowerCase()).not.toContain('npm');
    expect(html.toLowerCase()).not.toContain('brew');
    expect(html.toLowerCase()).not.toContain('curl');
  });
});

describe('the empty state caption on a machine tab', () => {
  // The local scan row CARRIES a command, which is the harder case: the
  // machine arm must win over it, because the command was read for this Mac.
  const withCommand = option({
    id: 'droid',
    label: 'Droid',
    installed: false,
    install: {
      command: 'curl -fsSL https://example.invalid/install | sh',
      docUrl: 'https://example.invalid/docs',
      readOn: '2026-08-01',
      canonicalIsPackageManager: false
    }
  });

  it('is one sentence naming the machine, with no command', () => {
    const html = renderToStaticMarkup(
      <HintedInstallCaption
        option={withCommand}
        machineLabel="Studio"
        onCopy={() => undefined}
      />
    );
    expect(agentMissingOnMachine('Droid', 'Studio')).toBe(
      'Tortie could not find Droid on Studio. Install it on that machine, ' +
        'or pick an agent that machine has.'
    );
    expect(html).toContain('Tortie could not find Droid on Studio.');
    expect(html).not.toContain('<code');
    expect(html).not.toContain('curl');
  });

  it('still hands the command over on this Mac', () => {
    const html = renderToStaticMarkup(
      <HintedInstallCaption option={withCommand} onCopy={() => undefined} />
    );
    expect(html).toContain('<code');
    expect(html).toContain('curl -fsSL');
  });
});

describe('a greyed tile on a machine tab', () => {
  const html = renderToStaticMarkup(
    <AgentGrid
      options={[
        option({ id: 'claude', label: 'Claude Code', installed: false }),
        option({ id: 'shell', label: 'Shell' })
      ]}
      mode="select"
      primaryId="shell"
      onActivate={() => {}}
      ariaLabel="Agent"
      machineLabel="Studio"
    />
  );

  it('names the machine in its aria label', () => {
    expect(agentNotOnMachineAria('Claude Code', 'Studio')).toBe(
      'Claude Code, not on Studio'
    );
    expect(html).toContain('aria-label="Claude Code, not on Studio"');
  });

  it('keeps the visible meta at the literal not installed', () => {
    // The meta slot measured 192 px against a 190 px floor; the machine
    // sentence is 47 characters against 13, so it lives in the aria label
    // and the sentence under the board, never on the tile.
    expect(html).toContain('>not installed<');
  });
});

describe('the sentence under the board', () => {
  it('names the machine and only speaks of what was asked', () => {
    expect(agentsAbsentHint('Studio')).toBe(
      'A greyed agent was not found on Studio when Tortie asked.'
    );
  });
});
