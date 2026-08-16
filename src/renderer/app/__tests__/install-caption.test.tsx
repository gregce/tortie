/**
 * Phase 49 — the install map's create-sheet and empty-state surfaces.
 *
 * What these tests hold:
 * - The install caption is fed by the SCAN row's `install` field and by
 *   nothing else. The hand-typed renderer tables (`AGENT_INSTALL_COMMANDS`,
 *   `agentInstallCommand`) are gone, and the pre-scan seed carries no
 *   command at all.
 * - State B's way 1 branches on `canonicalIsPackageManager`: a provider
 *   whose first choice is NOT a package manager gets its route named and
 *   its command shown; everyone else keeps the Phase 48 sentence.
 * - The staleness line appears when `readOn` is 181 days old and not at
 *   179 (research 47 §10: more than 180 days).
 * - The empty state's two sentences, rewritten in Phase 49, are pinned.
 *
 * The vitest environment is node, so the component assertions read static
 * markup from react-dom/server rather than a mounted DOM.
 */

import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

// The modal's module graph reaches the app store, whose slices read
// `window.gmux` while the store object is being created. The environment is
// node, so give the graph a bare window BEFORE any import runs (vi.hoisted
// runs ahead of the hoisted imports). No bridge: every read is feature
// detected, exactly like a renderer whose preload has not answered yet.
vi.hoisted(() => {
  (globalThis as { window?: unknown }).window = {
    gmux: undefined,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout,
    clearTimeout
  };
});
import type { AgentsScanResult, DetectedAgent } from '@shared/types';
import * as agentsModule from '../../state/agents';
import {
  buildAgentOptions,
  formatReadOn,
  INSTALL_NOTE_LINE,
  installReadIsStale,
  installSourceSentence,
  noInstallCommandLine,
  STALE_INSTALL_LINE,
  type AgentPickerOption
} from '../../state/agents';
import { BlockedWays, InstallSourceLines } from '../CreateSessionModal';
import { HintedInstallCaption } from '../EmptyStates';

const DAY = 86_400_000;

/** A full scan row with quiet defaults, overridden per case. */
function row(over: Partial<DetectedAgent>): DetectedAgent {
  return {
    id: 'droid',
    displayName: 'Droid',
    kind: 'cli',
    launchable: true,
    installed: false,
    binPath: null,
    version: null,
    storeDetected: false,
    iconKey: 'droid',
    unverified: true,
    ...over
  };
}

function scanOf(...agents: DetectedAgent[]): AgentsScanResult {
  return { agents, scannedAt: 1 };
}

const DROID_INSTALL = {
  command: 'curl -fsSL https://app.factory.ai/cli | sh',
  docUrl: 'https://docs.factory.ai/cli/getting-started/quickstart',
  readOn: '2026-08-15',
  canonicalIsPackageManager: false
};

const AVAIL = { claude: true, codex: true };

describe('the caption reads the scan, never a table', () => {
  it('carries the scan row install info onto the picker option', () => {
    const options = buildAgentOptions(
      scanOf(row({ install: DROID_INSTALL })),
      AVAIL
    );
    const droid = options.find((o) => o.id === 'droid');
    expect(droid?.install).toEqual(DROID_INSTALL);
  });

  it('carries null for a row whose provider publishes no command', () => {
    const options = buildAgentOptions(
      scanOf(row({ id: 'muse', displayName: 'Muse', install: null })),
      AVAIL
    );
    expect(options.find((o) => o.id === 'muse')?.install).toBeNull();
  });

  it('the pre-scan seed offers no command for any agent', () => {
    const options = buildAgentOptions(null, AVAIL);
    for (const o of options) expect(o.install).toBeNull();
  });

  it('the hand-typed tables are deleted', () => {
    expect('AGENT_INSTALL_COMMANDS' in agentsModule).toBe(false);
    expect('agentInstallCommand' in agentsModule).toBe(false);
  });
});

describe('the read-on date and the staleness boundary', () => {
  it('formats the ISO date as day, month name, year', () => {
    expect(formatReadOn('2026-08-15')).toBe('15 August 2026');
    expect(formatReadOn('2026-01-02')).toBe('2 January 2026');
  });

  it('is stale at 181 days and not at 179 or 180', () => {
    const read = Date.UTC(2026, 0, 1);
    expect(installReadIsStale('2026-01-01', read + 179 * DAY)).toBe(false);
    expect(installReadIsStale('2026-01-01', read + 180 * DAY)).toBe(false);
    expect(installReadIsStale('2026-01-01', read + 181 * DAY)).toBe(true);
  });

  it('draws the source line, the anchor, and the stale line only when old', () => {
    const read = Date.UTC(2026, 0, 1);
    const install = { ...DROID_INSTALL, readOn: '2026-01-01' };
    const fresh = renderToStaticMarkup(
      <InstallSourceLines install={install} nowMs={read + 179 * DAY} />
    );
    expect(fresh).toContain(installSourceSentence('2026-01-01'));
    expect(fresh).toContain('Read from the provider’s install page on 1 January 2026.');
    expect(fresh).toContain(`href="${DROID_INSTALL.docUrl}"`);
    expect(fresh).toContain('Open that page');
    expect(fresh).not.toContain(STALE_INSTALL_LINE);
    const old = renderToStaticMarkup(
      <InstallSourceLines install={install} nowMs={read + 181 * DAY} />
    );
    expect(old).toContain(STALE_INSTALL_LINE);
  });
});

describe('state B way 1 branches on canonicalIsPackageManager', () => {
  const blocked = {
    binPath: '/Users/x/.npm-global/bin/droid',
    interpreter: 'node',
    message: 'refused'
  };
  const render = (install: typeof DROID_INSTALL | null): string =>
    renderToStaticMarkup(
      <BlockedWays
        blocked={blocked}
        label="Droid"
        install={install}
        onCopy={() => {}}
      />
    );

  it('names the provider route and shows the command when the canonical is not a package manager', () => {
    const html = render(DROID_INSTALL);
    expect(html).toContain(
      'Install Droid the way its provider recommends. That version does not need node.'
    );
    expect(html).toContain('curl -fsSL https://app.factory.ai/cli | sh');
    expect(html).toContain('Copy install command for Droid');
    expect(html).toContain('Open that page');
  });

  it('keeps the Phase 48 sentence when the canonical IS a package manager', () => {
    const html = render({ ...DROID_INSTALL, canonicalIsPackageManager: true });
    expect(html).toContain(
      'Install droid another way, one that does not need node.'
    );
    expect(html).not.toContain('the way its provider recommends');
    expect(html).not.toContain('curl -fsSL');
  });

  it('keeps the Phase 48 sentence when there is no install info at all', () => {
    const html = render(null);
    expect(html).toContain(
      'Install droid another way, one that does not need node.'
    );
  });

  it('always keeps way 2', () => {
    for (const install of [DROID_INSTALL, null]) {
      expect(render(install)).toContain('Make node visible to Tortie.');
    }
  });
});

describe('the no-command sentence', () => {
  it('names the agent and the login shell qualifier', () => {
    expect(noInstallCommandLine('Muse')).toBe(
      'The provider does not publish an install command for Muse. ' +
        'Tortie finds it as soon as it is on your login shell’s PATH.'
    );
  });
});

describe('the empty state caption', () => {
  const option = (install: typeof DROID_INSTALL | null): AgentPickerOption => ({
    id: 'droid',
    label: 'Droid',
    iconKey: 'droid',
    installed: false,
    unverified: true,
    configState: null,
    install
  });

  it('hands over the command with the note line when one is published', () => {
    const html = renderToStaticMarkup(
      <HintedInstallCaption option={option(DROID_INSTALL)} />
    );
    expect(html).toContain(
      'Droid is not installed. Copy this command and run it in a terminal.'
    );
    expect(html).toContain('curl -fsSL https://app.factory.ai/cli | sh');
    expect(html).toContain(INSTALL_NOTE_LINE);
  });

  it('says only the login shell sentence when none is published', () => {
    const html = renderToStaticMarkup(
      <HintedInstallCaption option={option(null)} />
    );
    expect(html).toContain(
      'Droid is not installed. Tortie finds it as soon as it is on your login shell’s PATH.'
    );
    expect(html).not.toContain('Copy this command');
  });
});
