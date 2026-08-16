/**
 * The identity probe, against real shims (Phase 48 fix round).
 *
 * WHY THIS FILE EXISTS. The operator reported a second Mac where `claude` was
 * installed through npm and the pane died at once with no explanation. Phase
 * 48 built the refusal that explains it. A verifier then found that claude
 * could never reach that refusal on a fresh boot, because detection marked the
 * agent NOT INSTALLED first, and the click was refused before any create could
 * be attempted. The cause was one line: the identity substring was tested
 * against stdout and stderr JOINED, and a shim whose interpreter is missing
 * writes to stderr only.
 *
 * claude is the only one of the twelve compiled rows that carries an
 * `identitySubstring`, so it is the only one that could break this way, and
 * the operator's own agent is the one that did.
 *
 * These cases spawn real shims through the real `runGuarded`. Nothing about
 * tmux, Electron or the manifest is involved. The login shell PATH is the one
 * thing faked, because capturing the real one runs the user's shell.
 */

import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import type { AgentRegistryEntry } from '../registry';

const root = mkdtempSync(join(tmpdir(), 'p48-identity-'));
/** The directory the fake login shell PATH points at. Holds the shims. */
const binDir = join(root, 'bin');
mkdirSync(binDir, { recursive: true });

vi.mock('../../tmux/resolve', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../tmux/resolve')>();
  return {
    ...actual,
    getUserPath: () => Promise.resolve(binDir),
    // The probe dirs must be the scratch dir alone, so a real `claude` on this
    // machine can never be the thing that answers.
    extraBinDirs: () => [binDir]
  };
});

const { rescanAgents, resetDetectionCache, setAgentTableSource, resetAgentTableSource } =
  await import('../detection');

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

afterEach(() => {
  resetDetectionCache();
  resetAgentTableSource();
});

/** Write one executable shim into the fake PATH directory. */
function shim(name: string, body: string): void {
  const path = join(binDir, name);
  writeFileSync(path, body);
  chmodSync(path, 0o755);
}

/**
 * A one-row table wearing claude's real version probe, so the case under test
 * is the compiled rule rather than a rule invented here.
 */
function tableWith(binary: string): void {
  const entry = {
    id: 'claude',
    displayName: 'Claude Code',
    kind: 'cli',
    launchable: true,
    status: 'shipped-main',
    confidence: 'high',
    binaries: [binary],
    extraProbeDirs: [],
    storeDirs: [],
    versionProbe: { args: ['-v'], identitySubstring: '(Claude Code)' },
    launch: { argv: [binary] },
    resume: { strategy: 'none' }
  } as unknown as AgentRegistryEntry;
  setAgentTableSource(() => [entry]);
}

describe('a working agent', () => {
  it('is installed and carries its version', async () => {
    shim('p48-good', "#!/bin/sh\necho '2.1.227 (Claude Code)'\n");
    tableWith('p48-good');
    const scan = await rescanAgents();
    const row = scan.agents[0];
    expect(row?.installed).toBe(true);
    expect(row?.version).toBe('2.1.227 (Claude Code)');
  });
});

describe('a shim whose interpreter is missing', () => {
  /**
   * The exact failure the operator hit. `env` writes
   * "env: p48-no-such-node: No such file or directory" to STDERR and exits
   * 127, printing nothing at all to stdout.
   */
  it('stays installed, so the launch refusal is reachable', async () => {
    shim('p48-broken', '#!/usr/bin/env p48-no-such-node\nconsole.log(1)\n');
    tableWith('p48-broken');
    const scan = await rescanAgents();
    const row = scan.agents[0];
    expect(row?.installed).toBe(true);
    expect(row?.binPath).toBe(join(binDir, 'p48-broken'));
  });

  it('reports no version rather than reporting the error as one', async () => {
    shim('p48-broken2', '#!/usr/bin/env p48-no-such-node\n');
    tableWith('p48-broken2');
    const scan = await rescanAgents();
    expect(scan.agents[0]?.version).toBeNull();
  });
});

describe('a different program wearing the name', () => {
  /**
   * The case `identitySubstring` was added for, and it still fails. The
   * difference from the case above is that this program RAN and printed its
   * own greeting to stdout.
   */
  it('is refused when it runs and greets on stdout', async () => {
    shim('p48-impostor', "#!/bin/sh\necho 'claude 0.1 by somebody else'\n");
    tableWith('p48-impostor');
    const scan = await rescanAgents();
    const row = scan.agents[0];
    expect(row?.installed).toBe(false);
    expect(row?.version).toBeNull();
  });

  it('is refused even when it exits non-zero, as long as it greeted', async () => {
    shim('p48-impostor2', "#!/bin/sh\necho 'some other tool 3.0'\nexit 2\n");
    tableWith('p48-impostor2');
    const scan = await rescanAgents();
    expect(scan.agents[0]?.installed).toBe(false);
  });
});
