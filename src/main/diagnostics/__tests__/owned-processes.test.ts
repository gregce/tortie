/**
 * Unit tests for src/main/diagnostics/owned-processes.ts (Phase 13.8).
 *
 * The point of the module is that ownership — not the process's NAME — is
 * what makes something ours, because Phase 12.7 deliberately launches agents
 * by bare name. So the fixture below includes a `claude` that gmux owns and a
 * `claude` that it does not, and the test insists on telling them apart.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { parsePsTable } from '../../proc/ps';
import { listGmuxProcesses } from '../owned-processes';

const CONF = '/Users/x/gmux/resources/gmux-tmux.conf';

function psLine(pid: number, ppid: number, command: string, rssKb = 1024): string {
  return `${pid} ${ppid} ${rssKb} 0.0 ${command}`;
}

const TABLE = parsePsTable(
  [
    // gmux itself, with an Electron helper and its control client
    psLine(67024, 512, '/…/Electron.app/Contents/MacOS/Electron .', 200_000),
    psLine(67025, 67024, '/…/Electron Helper (Renderer)', 150_000),
    psLine(67829, 67024, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} -C new-session -A -s gmux-control`),
    // the private server, and a client from a previous run nobody owns
    psLine(3948, 1, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} start-server`, 14_752),
    psLine(6994, 1, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} -C new-session -A -s gmux-control`),
    // a gmux session running claude, which spawned a child of its own
    psLine(80100, 3948, 'claude', 400_000),
    psLine(80101, 80100, 'rg --files', 8_000),
    // …and a claude the user started in Terminal.app. NOT ours.
    psLine(90200, 900, 'claude', 380_000)
  ].join('\n')
);

const deps = {
  appPid: 67024,
  psTable: async () => TABLE,
  serverPid: async () => 3948,
  sessionPids: async () => [{ pid: 80100, sessionName: 'api-refactor' }]
};

describe('listGmuxProcesses', () => {
  it('assigns a role to every gmux-owned process, and claims nothing else', async () => {
    const rows = await listGmuxProcesses(deps);
    const byPid = new Map(rows.map((r) => [r.pid, r]));

    assert.equal(byPid.get(67024)?.role, 'app');
    assert.equal(byPid.get(67025)?.role, 'app-helper');
    assert.equal(byPid.get(67829)?.role, 'attach-client');
    assert.equal(byPid.get(3948)?.role, 'session-server');
    assert.equal(byPid.get(6994)?.role, 'orphan-client');
    assert.equal(byPid.get(80100)?.role, 'session');
    assert.equal(byPid.get(80101)?.role, 'session-child');

    // The user's own claude is invisible to us, which is the whole design.
    assert.equal(byPid.has(90200), false);
  });

  it('carries the session name down to the children a session spawned', async () => {
    const rows = await listGmuxProcesses(deps);
    const child = rows.find((r) => r.pid === 80101);
    assert.equal(child?.sessionName, 'api-refactor');
  });

  it('reports memory in bytes from ps KB', async () => {
    const rows = await listGmuxProcesses(deps);
    assert.equal(rows.find((r) => r.pid === 3948)?.rssBytes, 14_752 * 1024);
  });

  it('still answers when tmux cannot be reached', async () => {
    const rows = await listGmuxProcesses({
      ...deps,
      serverPid: async () => null,
      sessionPids: async () => {
        throw new Error('tmux unreachable');
      }
    });
    const byPid = new Map(rows.map((r) => [r.pid, r]));
    // The app's own tree survives the outage…
    assert.equal(byPid.get(67024)?.role, 'app');
    assert.equal(byPid.get(67025)?.role, 'app-helper');
    // …and the server is still found, by command line rather than by asking.
    assert.equal(byPid.get(3948)?.role, 'session-server');
    // Sessions are the only thing we lose, because only tmux knows them.
    assert.equal(byPid.has(80100), false);
  });
});
