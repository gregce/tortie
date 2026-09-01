/**
 * Unit tests for src/main/diagnostics/tree.ts (Phase 163).
 *
 * The one claim this module exists for: shell and sessions are two groups
 * with two totals that are never added, and a session row carries nothing
 * from the argv. The fixture puts a key on a session's command line and a
 * key on a helper's command line, and the assertions insist neither reaches
 * a row.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import type { GmuxProcess } from '../owned-processes';
import { buildTree, type ElectronMetric } from '../tree';

const SECRET = 'sk-ant-api03-THIS-MUST-NOT-LEAK';

function row(
  pid: number,
  ppid: number,
  role: GmuxProcess['role'],
  command: string,
  extra: Partial<GmuxProcess> = {}
): GmuxProcess {
  return {
    pid,
    ppid,
    role,
    rssBytes: 1024 * 1024,
    cpuPercent: 1,
    command,
    binary: command.split(' ')[0]?.split('/').pop() ?? '',
    ...extra
  };
}

const OWNED: GmuxProcess[] = [
  row(100, 1, 'app', '/Applications/Tortie.app/Contents/MacOS/Tortie'),
  row(101, 100, 'app-helper', '/Applications/Tortie.app/Contents/Frameworks/Tortie Helper (GPU).app/Contents/MacOS/Tortie Helper (GPU) --type=gpu-process', { binary: 'Tortie Helper (GPU)' }),
  row(102, 100, 'app-helper', '/Applications/Tortie.app/Contents/Frameworks/Tortie Helper (Renderer).app/Contents/MacOS/Tortie Helper (Renderer) --type=renderer', { binary: 'Tortie Helper (Renderer)' }),
  row(103, 100, 'control-client', '/opt/homebrew/bin/tmux -L gmux -C new-session -A -s gmux-control', { binary: 'tmux' }),
  row(104, 100, 'attach-client', '/opt/homebrew/bin/tmux -L gmux attach -t $3', { binary: 'tmux' }),
  row(105, 100, 'app-helper', `/opt/homebrew/bin/rg --files --token ${SECRET}`, { binary: 'rg' }),
  row(106, 1, 'ssh-helper', '/usr/bin/ssh -o ControlPath=/tmp/tortie-mux/m-0123456789ab box', { binary: 'ssh', machineLabel: 'box' }),
  row(200, 1, 'session-server', '/opt/homebrew/bin/tmux -L gmux start-server', { binary: 'tmux', rssBytes: 14_752 * 1024 }),
  row(300, 200, 'session', `claude --session-id abc --api-key ${SECRET}`, { sessionName: 'api', sessionId: 'S1', rssBytes: 400 * 1024 * 1024, binary: 'claude' }),
  row(301, 300, 'session-child', 'caffeinate', { sessionName: 'api', sessionId: 'S1' }),
  row(310, 200, 'session', 'zsh', { sessionName: 'scratch', binary: 'zsh' }),
  row(320, 200, 'app-helper', '-zsh', { sessionName: 'gmux-control', binary: 'zsh' }),
  row(900, 1, 'orphan-client', '/opt/homebrew/bin/tmux -L gmux attach', { binary: 'tmux' })
];

const METRICS: ElectronMetric[] = [
  { pid: 100, type: 'Browser', cpuPercent: 2.5, workingSetBytes: 240 * 1024 * 1024 },
  { pid: 101, type: 'GPU', cpuPercent: 0.5, workingSetBytes: 90 * 1024 * 1024 },
  { pid: 102, type: 'Tab', cpuPercent: 1.5, workingSetBytes: 260 * 1024 * 1024 },
  { pid: 107, type: 'Utility', name: 'Network Service', serviceName: 'network.mojom.NetworkService', cpuPercent: 0, workingSetBytes: 33 * 1024 * 1024 }
];

const FOOTPRINTS = new Map<number, number>([
  [101, 80 * 1024 * 1024],
  [103, 2 * 1024 * 1024],
  [104, 2 * 1024 * 1024],
  [105, 3 * 1024 * 1024],
  [106, 4 * 1024 * 1024],
  [107, 20 * 1024 * 1024],
  [200, 5 * 1024 * 1024],
  [300, 350 * 1024 * 1024],
  [301, 1 * 1024 * 1024],
  [310, 2 * 1024 * 1024],
  [320, 1 * 1024 * 1024]
]);

const INPUT = {
  owned: OWNED,
  metrics: METRICS,
  footprints: FOOTPRINTS,
  mainPrivateBytes: 200 * 1024 * 1024,
  rendererPrivateBytes: 180 * 1024 * 1024,
  mainWindowPid: 102,
  windows: [{ pid: 102, title: 'Tortie' }],
  sessions: [
    {
      id: 'S1', name: 'API refactor', agent: 'claude', remote: false,
      projectName: 'webapp', projectPath: '~/src/webapp',
      createdAt: 1_780_000_000_000, lastSeen: 1_780_000_900_000
    },
    {
      id: 'S2', name: 'far away', agent: 'codex', remote: true,
      projectName: null, projectPath: null, createdAt: null, lastSeen: null
    }
  ],
  appPid: 100
};

describe('buildTree', () => {
  const out = buildTree(INPUT);

  it('names every Electron process, and excludes none', () => {
    assert.deepEqual(
      out.electronPids.map((e) => [e.pid, e.type, e.named]),
      [[100, 'Browser', true], [101, 'GPU', true], [102, 'Tab', true], [107, 'Utility', true]]
    );
    // The network service was in Electron's list and not in ps: still a row.
    const net = out.shell.find((r) => r.pid === 107);
    assert.equal(net?.kind, 'utility');
    assert.equal(net?.name, 'Network Service');
    assert.equal(net?.detail, 'network.mojom.NetworkService');
    assert.equal(net?.memory.privateSource, 'footprint');
  });

  it('gives main and the window renderer their own private number, and everyone else the footprint', () => {
    const main = out.shell.find((r) => r.pid === 100);
    assert.equal(main?.kind, 'main');
    assert.deepEqual(main?.memory, { privateBytes: 200 * 1024 * 1024, privateSource: 'electron', rssBytes: 1024 * 1024 });
    assert.equal(main?.cpuSource, 'sampled');
    const renderer = out.shell.find((r) => r.pid === 102);
    assert.equal(renderer?.kind, 'renderer');
    assert.equal(renderer?.detail, 'Tortie');
    assert.equal(renderer?.memory.privateSource, 'electron');
    assert.equal(renderer?.memory.privateBytes, 180 * 1024 * 1024);
    const gpu = out.shell.find((r) => r.pid === 101);
    assert.equal(gpu?.kind, 'gpu');
    assert.equal(gpu?.memory.privateSource, 'footprint');
    assert.equal(gpu?.memory.privateBytes, 80 * 1024 * 1024);
  });

  it('splits the app tree by role and names a helper by its binary only', () => {
    const kinds = new Map(out.shell.map((r) => [r.pid, r.kind]));
    assert.equal(kinds.get(103), 'control-client');
    assert.equal(kinds.get(104), 'attach-client');
    assert.equal(kinds.get(105), 'helper');
    assert.equal(kinds.get(106), 'ssh-helper');
    assert.equal(kinds.get(200), 'session-server');
    assert.equal(kinds.get(900), 'orphan');
    // The event bus session's own shell is Tortie's row, not a session's.
    assert.equal(kinds.get(320), 'control-client');
    assert.equal(out.shell.find((r) => r.pid === 320)?.name, 'event bus session');
    assert.equal(out.sessions.some((s) => s.name === 'gmux-control'), false);
    assert.equal(out.shell.find((r) => r.pid === 105)?.name, 'rg');
    assert.equal(out.shell.find((r) => r.pid === 106)?.detail, 'box');
    assert.equal(out.shell.find((r) => r.pid === 200)?.cpuSource, 'lifetime');
  });

  it('folds each session subtree into one row named from the manifest, never from the argv', () => {
    assert.equal(out.sessions.length, 2);
    const api = out.sessions.find((s) => s.sessionId === 'S1');
    assert.equal(api?.name, 'API refactor');
    assert.equal(api?.agent, 'claude');
    assert.equal(api?.processCount, 2);
    assert.equal(api?.memory.privateBytes, 351 * 1024 * 1024);
    assert.equal(api?.memory.rssBytes, 401 * 1024 * 1024);
    // A pane with no @gmux-id keeps the server's name and an unknown agent.
    const scratch = out.sessions.find((s) => s.sessionId === null);
    assert.equal(scratch?.name, 'scratch');
    assert.equal(scratch?.agent, 'unknown');
    // A remote session has no pane here and draws no workload row.
    assert.equal(out.sessions.some((s) => s.sessionId === 'S2'), false);
  });

  // PHASE 188. The row has to say whose work it is. The join is one place,
  // and it is the branch that already tolerates a miss, so the row a person
  // could not trace keeps drawing rather than vanishing or guessing.
  it('carries the project and both epochs onto the row that has a manifest match', () => {
    const api = out.sessions.find((s) => s.sessionId === 'S1');
    assert.equal(api?.projectName, 'webapp');
    assert.equal(api?.projectPath, '~/src/webapp');
    assert.equal(api?.createdAt, 1_780_000_000_000);
    assert.equal(api?.lastSeen, 1_780_000_900_000);
  });

  it('draws the row with no manifest match, with all four fields null', () => {
    const scratch = out.sessions.find((s) => s.sessionId === null);
    assert.equal(scratch?.name, 'scratch');
    assert.equal(scratch?.projectName, null);
    assert.equal(scratch?.projectPath, null);
    assert.equal(scratch?.createdAt, null);
    assert.equal(scratch?.lastSeen, null);
  });

  it('draws a row whose manifest row is gone, rather than dropping it', () => {
    // Same panes, but this run's session list has lost S1's record. The row
    // must still be there, named from the server, with the four cells empty.
    const gone = buildTree({ ...INPUT, sessions: [] });
    assert.equal(gone.sessions.length, 2);
    const api = gone.sessions.find((s) => s.sessionId === 'S1');
    assert.equal(api?.name, 'api');
    assert.equal(api?.agent, 'unknown');
    assert.equal(api?.processCount, 2);
    assert.equal(api?.projectName, null);
    assert.equal(api?.projectPath, null);
    assert.equal(api?.createdAt, null);
    assert.equal(api?.lastSeen, null);
  });

  it('keeps the two totals apart and never adds them', () => {
    // The orphan at 900 is drawn in shell and counted in leftoverTotal only.
    assert.equal(out.shellTotal.processCount, out.shell.length - 1);
    assert.equal(out.sessionsTotal.processCount, 3);
    // Shell private: main 200 + gpu 80 + renderer 180 + net 20 + clients 2+2 + rg 3 + ssh 4 + server 5 + event bus shell 1, orphan none
    assert.equal(out.shellTotal.privateBytes, (200 + 80 + 180 + 20 + 2 + 2 + 3 + 4 + 5 + 1) * 1024 * 1024);
    assert.equal(out.shellTotal.rssBytes, out.shell.filter((r) => r.kind !== 'orphan').reduce((n, r) => n + r.memory.rssBytes, 0));
    assert.deepEqual(out.leftoverTotal, { privateBytes: 0, rssBytes: 1024 * 1024, processCount: 1 });
    assert.equal(out.sessionsTotal.privateBytes, (350 + 1 + 2) * 1024 * 1024);
    // No pid is in both groups.
    const shellPids = new Set(out.shell.map((r) => r.pid));
    for (const pid of [300, 301, 310]) assert.equal(shellPids.has(pid), false);
  });

  it('carries no command line anywhere in either group', () => {
    const json = JSON.stringify(out);
    assert.equal(json.includes(SECRET), false);
    assert.equal(json.includes('--session-id'), false);
    assert.equal(json.includes('command'), false);
  });

  it('answers with an empty tree over empty inputs', () => {
    const empty = buildTree({ ...INPUT, owned: [], metrics: [], footprints: new Map(), windows: [], sessions: [] });
    assert.deepEqual(empty.shell, []);
    assert.deepEqual(empty.sessions, []);
    assert.deepEqual(empty.shellTotal, { privateBytes: 0, rssBytes: 0, processCount: 0 });
    assert.deepEqual(empty.leftoverTotal, { privateBytes: 0, rssBytes: 0, processCount: 0 });
  });
});
