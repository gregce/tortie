/**
 * Phase 330.1: every run of the Tailscale program is told to answer as a
 * command line.
 *
 * The program inside Tailscale's macOS app answers as a command line only when
 * its environment carries `TAILSCALE_BE_CLI=1` (or a terminal's `TERM`).
 * Without either it prints "The Tailscale GUI failed to start: …" on stdout and
 * exits 0, which is what Tortie 0.111.0 read when it was opened from the Dock
 * or Finder. The stand-in below behaves the same way, and every assertion runs
 * with `TERM` removed from the environment the program inherits, so a pass here
 * cannot come from the test runner's own terminal.
 */
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  TAILSCALE_CLI_VARIABLE,
  readTailnetMachines,
  tailscaleCliEnv
} from '../../machines/tailscale';
import { defaultFunnelDeps, readServe, readTailnet, type FunnelDeps } from '../funnel';

const GUI_LINE = 'The Tailscale GUI failed to start: The operation couldn’t be completed. (Tailscale.CLIError error 3.)';

const STATUS = JSON.stringify({
  BackendState: 'Running',
  CurrentTailnet: { Name: 'example.ts.net' },
  Self: { DNSName: 'p3301-mac.tail0000.ts.net.', CapMap: {} },
  // One other machine, online, so the Machines list has something to show
  // only when the status was read: the window sentence would list nothing.
  Peer: {
    'nodekey:p3301': {
      HostName: 'p3301-other',
      DNSName: 'p3301-other.tail0000.ts.net.',
      TailscaleIPs: ['100.64.0.2'],
      OS: 'linux',
      Online: true
    }
  }
});

let dir = '';
let program = '';
let envProgram = '';
const savedTerm = process.env['TERM'];
const savedTermProgram = process.env['TERM_PROGRAM'];

beforeAll(() => {
  // The runner's own terminal must not be what makes the stand-in answer.
  delete process.env['TERM'];
  delete process.env['TERM_PROGRAM'];
  delete process.env[TAILSCALE_CLI_VARIABLE];
  dir = mkdtempSync(join(tmpdir(), 'p3301-'));
  program = join(dir, 'Tailscale');
  writeFileSync(
    program,
    [
      '#!/bin/sh',
      // Stricter than the real program, which also answers to a terminal's
      // TERM: only the variable Tortie sets makes this one answer.
      `if [ "$${TAILSCALE_CLI_VARIABLE}" != "1" ]; then`,
      `  printf '%s\\n' '${GUI_LINE}'`,
      '  exit 0',
      'fi',
      'if [ "$1" = "serve" ]; then printf "{}\\n"; exit 0; fi',
      `printf '%s\\n' '${STATUS}'`,
      ''
    ].join('\n')
  );
  chmodSync(program, 0o755);
  envProgram = join(dir, 'print-env');
  writeFileSync(envProgram, `#!/bin/sh\nprintf '%s\\n' "${'$'}${TAILSCALE_CLI_VARIABLE}"\n`);
  chmodSync(envProgram, 0o755);
});

afterAll(() => {
  if (savedTerm !== undefined) process.env['TERM'] = savedTerm;
  if (savedTermProgram !== undefined) process.env['TERM_PROGRAM'] = savedTermProgram;
  if (dir !== '') rmSync(dir, { recursive: true, force: true });
});

function depsFor(path: string): FunnelDeps {
  return {
    ...defaultFunnelDeps(),
    resolve: () => ({
      resolution: { path, source: 'dev-override', detail: path },
      overrideSet: true
    })
  };
}

describe('Phase 330.1, the Tailscale program is told to answer as a command line', () => {
  it('tailscaleCliEnv adds the variable and leaves the base untouched', () => {
    const base: NodeJS.ProcessEnv = { HOME: '/nowhere', PATH: '/usr/bin' };
    const env = tailscaleCliEnv(base);
    expect(env[TAILSCALE_CLI_VARIABLE]).toBe('1');
    expect(env['HOME']).toBe('/nowhere');
    expect(base[TAILSCALE_CLI_VARIABLE]).toBeUndefined();
  });

  it('the stand-in prints the window sentence when it is not told', async () => {
    const { execFileSync } = await import('node:child_process');
    const env = { ...process.env };
    delete env[TAILSCALE_CLI_VARIABLE];
    delete env['TERM'];
    const out = execFileSync(program, ['status', '--json'], { env, encoding: 'utf8' });
    expect(out).toContain('The Tailscale GUI failed to start');
  });

  it("the phone door's status read reads the status, with no TERM", async () => {
    const read = await readTailnet(depsFor(program));
    expect(read.ok).toBe(true);
    if (read.ok) expect(read.publicName).toBe('p3301-mac.tail0000.ts.net');
  });

  it("the phone door's serve read reads the serve config, with no TERM", async () => {
    const served = await readServe(depsFor(program), program);
    // `{}` is a serve config with nothing served; undefined would be unreadable.
    expect(served).toEqual({});
  });

  it('the Funnel child is spawned with the variable set', async () => {
    const child = defaultFunnelDeps().spawn(envProgram, []) as unknown as {
      stdout: NodeJS.ReadableStream;
      on(event: 'close', cb: () => void): void;
    };
    let out = '';
    child.stdout.on('data', (chunk: Buffer) => {
      out += chunk.toString('utf8');
    });
    await new Promise<void>((resolve) => child.on('close', () => resolve()));
    expect(out.trim()).toBe('1');
  });

  it('the Machines tailnet list reads the status, with no TERM', async () => {
    const result = await readTailnetMachines({
      packaged: false,
      env: { GMUX_TAILSCALE_BIN: program },
      alreadyAdded: []
    });
    expect(result.binary).toBe(program);
    // It answered and listed the one other machine; the window sentence would
    // have listed none and drawn the empty note.
    expect(result.note).toBeNull();
    expect(result.peers.filter((p) => !p.isThisMac).map((p) => p.name)).toContain('p3301-other');
  });
});
