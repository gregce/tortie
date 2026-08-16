/**
 * Phase 49 — Settings → Agents: the install map's passive lines.
 *
 * What these tests hold:
 * - State C (research 47 §7) renders ONLY for `installKind:
 *   'package-manager'`. A canonical or unknown install draws nothing,
 *   because an install that works is not a problem.
 * - The state C sentence names the manager (npm, Homebrew, or the generic
 *   form) and, for an npm script with a resolved interpreter, what it runs
 *   on and from where.
 * - The native-route recommendation appears only when the provider's own
 *   first choice is not a package manager.
 * - The shadowed-copies sentence composes with and without versions, with
 *   the override wording, and with one extra sentence per extra copy.
 * - The not-installed row shows the provider's command from the SCAN row,
 *   the copy button, the source line and the staleness line.
 *
 * The vitest environment is node, so the component assertions read static
 * markup from react-dom/server rather than a mounted DOM.
 */

import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { DetectedAgent } from '@shared/types';
import {
  installKindLine,
  nativeRecommendSentence,
  packageManagerLabel,
  shadowedLine,
  STALE_INSTALL_LINE,
  type InstallCopySegment
} from '../../state/agents';
import {
  AgentRow,
  InstallKindNote,
  InstallSourceNote,
  ShadowedNote
} from '../AgentsSection';

/** The composed sentence as plain text. */
function text(line: InstallCopySegment[] | null): string | null {
  return line === null ? null : line.map((s) => s.text).join('');
}

/** A full scan row with quiet defaults, overridden per case. */
function row(over: Partial<DetectedAgent>): DetectedAgent {
  return {
    id: 'gemini',
    displayName: 'Gemini',
    kind: 'cli',
    launchable: true,
    installed: true,
    binPath: '/Users/x/.npm-global/bin/gemini',
    version: '0.9.0',
    storeDetected: false,
    iconKey: 'gemini',
    unverified: false,
    ...over
  };
}

const NPM_SCRIPT = row({
  installKind: 'package-manager',
  realPath: '/Users/x/.npm-global/lib/node_modules/@google/gemini-cli/dist/index.js',
  runtime: {
    kind: 'script',
    interpreter: 'node',
    interpreterPath: '/Users/x/.nvm/versions/node/v22.23.1/bin/node'
  },
  install: {
    command: 'npm install -g @google/gemini-cli',
    docUrl: 'https://geminicli.com/docs/get-started/installation',
    readOn: '2026-08-15',
    canonicalIsPackageManager: true
  }
});

describe('state C, the install kind line', () => {
  it('composes the npm script sentence with the interpreter and its source', () => {
    expect(text(installKindLine(NPM_SCRIPT))).toBe(
      'Installed with npm, at ~/.npm-global/bin/gemini. ' +
        'Runs on node from ~/.nvm/versions/node/v22.23.1/bin/node.'
    );
  });

  it('composes the plain npm sentence for a binary runtime', () => {
    const agent = row({
      installKind: 'package-manager',
      realPath: '/Users/x/.npm-global/lib/node_modules/x/bin/gemini',
      runtime: { kind: 'binary' }
    });
    expect(text(installKindLine(agent))).toBe(
      'Installed with npm, at ~/.npm-global/bin/gemini.'
    );
  });

  it('composes the Homebrew sentence', () => {
    const agent = row({
      binPath: '/opt/homebrew/bin/qwen',
      installKind: 'package-manager',
      realPath: '/opt/homebrew/Cellar/qwen-code/1.0.0/bin/qwen'
    });
    expect(text(installKindLine(agent))).toBe(
      'Installed with Homebrew, at /opt/homebrew/bin/qwen.'
    );
  });

  it('composes the generic sentence for any other package manager shape', () => {
    const agent = row({
      installKind: 'package-manager',
      realPath: '/some/portage/tree/bin/gemini'
    });
    expect(text(installKindLine(agent))).toBe(
      'Installed from a package manager, at ~/.npm-global/bin/gemini.'
    );
  });

  it('never renders for a canonical or unknown install', () => {
    for (const installKind of ['canonical', 'unknown', undefined] as const) {
      const agent = row(
        installKind === undefined ? {} : { installKind }
      );
      expect(installKindLine(agent)).toBeNull();
      expect(
        renderToStaticMarkup(<InstallKindNote agent={agent} />)
      ).toBe('');
    }
  });

  it('classifies the manager from the real path', () => {
    expect(packageManagerLabel('/Users/x/lib/node_modules/a/b.js')).toBe('npm');
    expect(packageManagerLabel('/opt/homebrew/Cellar/a/1/bin/a')).toBe('Homebrew');
    expect(packageManagerLabel('/usr/local/Cellar/a/1/bin/a')).toBe('Homebrew');
    expect(packageManagerLabel('/somewhere/else')).toBeNull();
    expect(packageManagerLabel(null)).toBeNull();
  });
});

describe('the native route recommendation', () => {
  it('is absent when the canonical route IS a package manager', () => {
    expect(nativeRecommendSentence(NPM_SCRIPT)).toBeNull();
  });

  it('names the interpreter the native install avoids', () => {
    const agent = row({
      id: 'pi',
      installKind: 'package-manager',
      realPath: '/Users/x/.npm-global/lib/node_modules/pi/cli.js',
      runtime: { kind: 'script', interpreter: 'node', interpreterPath: null },
      install: {
        command: 'curl -fsSL https://pi.dev/install.sh | sh',
        docUrl: 'https://pi.dev',
        readOn: '2026-08-15',
        canonicalIsPackageManager: false
      }
    });
    expect(nativeRecommendSentence(agent)).toBe(
      'The provider recommends the native install, which does not need node.'
    );
    const html = renderToStaticMarkup(<InstallKindNote agent={agent} />);
    expect(html).toContain('Read the install page');
    expect(html).toContain('href="https://pi.dev"');
  });

  it('is absent entirely for a canonical install', () => {
    const agent = row({ installKind: 'canonical' });
    expect(nativeRecommendSentence(agent)).toBeNull();
  });
});

describe('the shadowed copies sentence', () => {
  const codex = (over: Partial<DetectedAgent>): DetectedAgent =>
    row({
      id: 'codex',
      displayName: 'Codex',
      binPath: '/Users/x/.local/bin/codex',
      version: '0.147.0',
      ...over
    });

  it('composes the two-copy sentence with both versions', () => {
    const agent = codex({
      shadowed: [{ path: '/Users/x/.npm-global/bin/codex', version: '0.77.0' }]
    });
    expect(text(shadowedLine(agent))).toBe(
      'Two copies of codex are installed. Tortie uses ~/.local/bin/codex, ' +
        'version 0.147.0, because it comes first on your PATH. There is ' +
        'also ~/.npm-global/bin/codex, version 0.77.0.'
    );
  });

  it('drops the version clause where the probe had no answer', () => {
    const agent = codex({
      version: null,
      shadowed: [{ path: '/Users/x/.npm-global/bin/codex', version: null }]
    });
    expect(text(shadowedLine(agent))).toBe(
      'Two copies of codex are installed. Tortie uses ~/.local/bin/codex, ' +
        'because it comes first on your PATH. There is also ' +
        '~/.npm-global/bin/codex.'
    );
  });

  it('uses the override wording when an agents.json patch pinned the path', () => {
    const agent = codex({
      overridden: true,
      shadowed: [{ path: '/Users/x/.npm-global/bin/codex', version: '0.77.0' }]
    });
    expect(text(shadowedLine(agent))).toContain(
      'Tortie uses ~/.local/bin/codex, version 0.147.0, because you set ' +
        'its path in your agents file and confirmed it.'
    );
  });

  it('gives each copy beyond the second its own sentence and counts them', () => {
    const agent = codex({
      shadowed: [
        { path: '/Users/x/.npm-global/bin/codex', version: '0.77.0' },
        { path: '/usr/local/bin/codex', version: null }
      ]
    });
    const line = text(shadowedLine(agent));
    expect(line).toContain('Three copies of codex are installed.');
    expect(line).toContain('There is also ~/.npm-global/bin/codex, version 0.77.0.');
    expect(line).toContain('There is also /usr/local/bin/codex.');
  });

  it('renders nothing when nothing is shadowed', () => {
    expect(shadowedLine(codex({}))).toBeNull();
    expect(shadowedLine(codex({ shadowed: [] }))).toBeNull();
    expect(renderToStaticMarkup(<ShadowedNote agent={codex({})} />)).toBe('');
  });
});

describe('the rows', () => {
  it('a not-installed row shows the scan command, the copy button and the source line', () => {
    const agent = row({
      id: 'droid',
      displayName: 'Droid',
      installed: false,
      binPath: null,
      version: null,
      install: {
        command: 'curl -fsSL https://app.factory.ai/cli | sh',
        docUrl: 'https://docs.factory.ai/cli/getting-started/quickstart',
        readOn: '2026-08-15',
        canonicalIsPackageManager: false
      }
    });
    const html = renderToStaticMarkup(<AgentRow agent={agent} />);
    expect(html).toContain('Not installed');
    expect(html).toContain('curl -fsSL https://app.factory.ai/cli | sh');
    expect(html).toContain('Copy install command for Droid');
    expect(html).toContain('Read from the provider’s install page on 15 August 2026.');
    expect(html).toContain('Open that page');
  });

  it('a not-installed row with no published command shows Not installed alone', () => {
    const agent = row({
      id: 'muse',
      displayName: 'Muse',
      installed: false,
      binPath: null,
      version: null,
      install: null
    });
    const html = renderToStaticMarkup(<AgentRow agent={agent} />);
    expect(html).toContain('Not installed');
    expect(html).not.toContain('Copy install command');
    expect(html).not.toContain('Read from the provider');
  });

  it('the staleness line rides the source note only when the read date is old', () => {
    const install = {
      command: 'x',
      docUrl: 'https://example.com',
      readOn: '2026-01-01',
      canonicalIsPackageManager: false
    };
    const read = Date.UTC(2026, 0, 1);
    const DAY = 86_400_000;
    expect(
      renderToStaticMarkup(
        <InstallSourceNote install={install} nowMs={read + 179 * DAY} />
      )
    ).not.toContain(STALE_INSTALL_LINE);
    expect(
      renderToStaticMarkup(
        <InstallSourceNote install={install} nowMs={read + 181 * DAY} />
      )
    ).toContain(STALE_INSTALL_LINE);
  });

  it('an installed package-manager row carries the state C line', () => {
    const html = renderToStaticMarkup(<AgentRow agent={NPM_SCRIPT} />);
    expect(html).toContain('Installed with npm, at ');
    expect(html).toContain('~/.npm-global/bin/gemini');
    expect(html).toContain('Runs on ');
  });
});
