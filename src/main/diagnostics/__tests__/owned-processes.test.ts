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
import {
  binaryOf,
  findSessionServer,
  listGmuxProcesses,
  namesSocket,
  PANE_FORMAT,
  parseSessionPanes,
  sshControlLeafOf
} from '../owned-processes';

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
    psLine(90200, 900, 'claude', 380_000),
    // Phase 163: a ripgrep the app spawned, a live ssh child for a machine, a
    // persisted ssh master launchd now holds, and an ssh that is NOT ours.
    psLine(67900, 67024, '/opt/homebrew/bin/rg --files', 8_000),
    psLine(67901, 67024, '/usr/bin/ssh -o ControlMaster=auto -o ControlPath=/var/folders/x/T/tortie-mux/m-0123456789ab -o ControlPersist=60s box', 6_000),
    psLine(70000, 1, '/usr/bin/ssh: /var/folders/x/T/tortie-mux/m-0123456789ab [mux]', 5_000),
    psLine(70001, 1, '/usr/bin/ssh -o ControlPath=/Users/x/.ssh/cm-%r@%h:%p other', 5_000),
    // Phase 163: a scratch harness server whose socket name STARTS with ours,
    // and the event bus session's own shell inside our server. The first is
    // not ours; the second is Tortie's and not a person's work.
    psLine(71000, 1, `/opt/homebrew/bin/tmux -L gmux-smoke-t1 -f ${CONF} start-server`, 30_000),
    psLine(71001, 1, `/opt/homebrew/bin/tmux -L gmux-smoke-t1 -C new-session -A -s gmux-control`),
    psLine(80500, 3948, '-zsh', 2_000)
  ].join('\n')
);

const deps = {
  appPid: 67024,
  psTable: async () => TABLE,
  serverPid: async () => 3948,
  sessionPids: async () => [
    { pid: 80100, sessionName: 'api-refactor', sessionId: 'S1' },
    { pid: 80500, sessionName: 'gmux-control' }
  ],
  sshLeafLabels: new Map([['m-0123456789ab', 'box']]),
  socket: 'gmux'
};

describe('listGmuxProcesses', () => {
  it('assigns a role to every gmux-owned process, and claims nothing else', async () => {
    const rows = await listGmuxProcesses(deps);
    const byPid = new Map(rows.map((r) => [r.pid, r]));

    assert.equal(byPid.get(67024)?.role, 'app');
    assert.equal(byPid.get(67025)?.role, 'app-helper');
    // Phase 163: the `-C` client is the event bus, its own role.
    assert.equal(byPid.get(67829)?.role, 'control-client');
    assert.equal(byPid.get(3948)?.role, 'session-server');
    assert.equal(byPid.get(6994)?.role, 'orphan-client');
    assert.equal(byPid.get(80100)?.role, 'session');
    assert.equal(byPid.get(80101)?.role, 'session-child');

    // The user's own claude is invisible to us, which is the whole design.
    assert.equal(byPid.has(90200), false);
    // Phase 163: a socket whose name merely starts with ours is not ours.
    assert.equal(byPid.has(71000), false);
    assert.equal(byPid.has(71001), false);
    // Phase 163: the event bus session's shell is the app's, not a session.
    assert.equal(byPid.get(80500)?.role, 'app-helper');
    assert.equal(byPid.get(80500)?.sessionName, 'gmux-control');
  });

  it('carries the session name and id down to the children a session spawned', async () => {
    const rows = await listGmuxProcesses(deps);
    const child = rows.find((r) => r.pid === 80101);
    assert.equal(child?.sessionName, 'api-refactor');
    assert.equal(child?.sessionId, 'S1');
  });

  it('names every row by the basename of what was launched (Phase 163)', async () => {
    const rows = await listGmuxProcesses(deps);
    const byPid = new Map(rows.map((r) => [r.pid, r]));
    assert.equal(byPid.get(67024)?.binary, 'Electron');
    assert.equal(byPid.get(67025)?.binary, 'Electron Helper (Renderer)');
    assert.equal(byPid.get(67829)?.binary, 'tmux');
    assert.equal(byPid.get(67900)?.binary, 'rg');
    assert.equal(byPid.get(80100)?.binary, 'claude');
  });

  it('finds the ssh helpers by the control socket Tortie composed, and no other ssh (Phase 163)', async () => {
    const rows = await listGmuxProcesses(deps);
    const byPid = new Map(rows.map((r) => [r.pid, r]));
    // A live child of the app that is ssh.
    assert.equal(byPid.get(67901)?.role, 'ssh-helper');
    assert.equal(byPid.get(67901)?.machineLabel, 'box');
    // A persisted master launchd holds, matched by the leaf and labelled.
    assert.equal(byPid.get(70000)?.role, 'ssh-helper');
    assert.equal(byPid.get(70000)?.machineLabel, 'box');
    // The person's own ssh, with their own control path, is invisible to us.
    assert.equal(byPid.has(70001), false);
    // And a helper that is not tmux and not ssh stays an app helper.
    assert.equal(byPid.get(67900)?.role, 'app-helper');
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

describe('binaryOf', () => {
  it('takes the basename of argv[0], with an app helper name kept whole', () => {
    assert.equal(binaryOf('/opt/homebrew/bin/tmux -L gmux attach'), 'tmux');
    assert.equal(binaryOf('claude --resume abc'), 'claude');
    assert.equal(binaryOf('/Applications/Tortie.app/Contents/Frameworks/Tortie Helper (GPU).app/Contents/MacOS/Tortie Helper (GPU) --type=gpu-process'), 'Tortie Helper (GPU)');
    assert.equal(binaryOf('/usr/bin/ssh: /tmp/tortie-mux/m-0123456789ab [mux]'), 'ssh');
    assert.equal(binaryOf(''), '');
    assert.equal(binaryOf('   '), '');
    assert.equal(binaryOf('  /bin/zsh -c "export TOKEN=x"  '), 'zsh');
  });

  it('drops everything after argv[0], which is where a key would be', () => {
    const out = binaryOf('/usr/bin/env OPENAI_API_KEY=sk-live-123 codex');
    assert.equal(out, 'env');
    assert.equal(out.includes('sk-live'), false);
  });
});

describe('sshControlLeafOf', () => {
  it('reads the twelve hex leaf and nothing else', () => {
    assert.equal(sshControlLeafOf('ssh -o ControlPath=/tmp/tortie-mux/m-0123456789ab box'), 'm-0123456789ab');
    assert.equal(sshControlLeafOf('ssh -o ControlPath=/Users/x/.ssh/cm-%r box'), null);
    assert.equal(sshControlLeafOf('ssh -o ControlPath=/tmp/tortie-mux/m-xyz box'), null);
  });
});

describe('parseSessionPanes', () => {
  it('reads pid, name and the @gmux-id, empty when unset', () => {
    assert.equal(PANE_FORMAT, '#{pane_pid}\t#{session_name}\t#{@gmux-id}');
    assert.deepEqual(
      parseSessionPanes('80100\tapi-refactor\tS1\n80200\tscratch\t\nbad\tx\ty\n'),
      [
        { pid: 80100, sessionName: 'api-refactor', sessionId: 'S1' },
        { pid: 80200, sessionName: 'scratch' }
      ]
    );
  });
});

describe('namesSocket', () => {
  it('matches the socket as a whole word, never as a prefix', () => {
    assert.equal(namesSocket('tmux -L gmux attach', 'gmux'), true);
    assert.equal(namesSocket('tmux -L gmux', 'gmux'), true);
    assert.equal(namesSocket('tmux -L gmux-smoke-t1 attach', 'gmux'), false);
    assert.equal(namesSocket('tmux -L gmux-smoke-t1 attach', 'gmux-smoke-t1'), true);
    assert.equal(namesSocket('tmux attach', 'gmux'), false);
  });

  it('keeps findSessionServer off a scratch server', () => {
    assert.equal(findSessionServer(TABLE.values(), 'gmux'), 3948);
    assert.equal(findSessionServer(TABLE.values(), 'gmux-smoke-t1'), 71000);
  });
});
