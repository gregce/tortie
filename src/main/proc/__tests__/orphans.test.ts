/**
 * Unit tests for src/main/proc/ps.ts and the orphan matcher in
 * src/main/proc/orphans.ts (Phase 13.8).
 *
 * Both matchers signal real processes in production, so the safety conditions
 * are tested one refusal at a time: not ours, not orphaned, not tmux, never
 * the server — and, for the stranded PATH probes, never one a live gmux is
 * still waiting on.
 */

import { afterEach, describe, it, vi } from 'vitest';
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { childIndex, descendantsOf, parsePsTable, type ProcRow } from '../ps';
import {
  endStrandedPathProbes,
  findOrphanedClients,
  findStrandedPathProbes,
  reapOrphanedTmuxClients
} from '../orphans';

// Phase 167. The reap is driven END TO END below over a real process, so the
// two things it reads from the machine are the two things stubbed: the live
// process table (this lane never reads it) and the private tmux server (a
// unit test has none, and an unreachable server is the documented skip path
// that still reaps probes). Everything else is the real module.
const psTable = vi.hoisted(() => ({ rows: new Map<number, ProcRow>() }));
vi.mock('../ps', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../ps')>();
  return { ...actual, readPsTable: async () => psTable.rows };
});
vi.mock('../../tmux/supervisor', () => ({
  activeTmuxSocket: () => 'gmux',
  execTmux: async () => {
    throw new Error('no tmux server in a unit test');
  }
}));

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const CONF = '/Users/x/gmux/resources/gmux-tmux.conf';

/** One `ps -axo pid=,ppid=,rss=,pcpu=,command=` line. */
function psLine(
  pid: number,
  ppid: number,
  command: string,
  rssKb = 1024,
  cpu = '0.0'
): string {
  return `${String(pid).padStart(6)} ${String(ppid).padStart(6)} ${String(rssKb).padStart(6)} ${cpu.padStart(5)} ${command}`;
}

describe('parsePsTable', () => {
  it('parses the numeric columns and keeps the command whole', () => {
    const rows = parsePsTable(
      [
        psLine(3948, 1, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} start-server`, 14752, '1.0'),
        psLine(67024, 512, '/Users/x/gmux/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .')
      ].join('\n')
    );
    const server = rows.get(3948);
    assert.ok(server !== undefined);
    assert.equal(server.ppid, 1);
    assert.equal(server.rssKb, 14752);
    assert.equal(server.cpuPercent, 1);
    assert.ok(server.command.endsWith('start-server'));
    assert.equal(rows.size, 2);
  });

  it('ignores headers and blank lines', () => {
    const rows = parsePsTable('  PID  PPID   RSS  %CPU COMMAND\n\n');
    assert.equal(rows.size, 0);
  });
});

describe('descendantsOf', () => {
  it('walks the whole subtree and never loops', () => {
    const rows = parsePsTable(
      [
        psLine(100, 1, 'app'),
        psLine(200, 100, 'helper'),
        psLine(300, 200, 'grandchild'),
        psLine(400, 999, 'stranger')
      ].join('\n')
    );
    const kids = childIndex(rows);
    assert.deepEqual(descendantsOf(kids, 100).sort(), [200, 300]);
    assert.deepEqual(descendantsOf(kids, 400), []);
  });
});

describe('findOrphanedClients — the four safety conditions', () => {
  const server = 3948;
  const orphan = psLine(6994, 1, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} -C new-session -A -s gmux-control`);

  it('finds a re-parented control client on OUR socket', () => {
    const rows = parsePsTable(orphan);
    assert.deepEqual(findOrphanedClients(rows.values(), server), [6994]);
  });

  it('spares the server itself', () => {
    const rows = parsePsTable(
      psLine(server, 1, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} start-server`)
    );
    assert.deepEqual(findOrphanedClients(rows.values(), server), []);
  });

  it('spares a client a LIVE gmux still owns (ppid is not 1)', () => {
    const rows = parsePsTable(
      psLine(67829, 67024, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} -C new-session -A -s gmux-control`)
    );
    assert.deepEqual(findOrphanedClients(rows.values(), server), []);
  });

  it("spares the user's own tmux (default socket, and any other socket)", () => {
    const rows = parsePsTable(
      [
        psLine(500, 1, '/opt/homebrew/bin/tmux'),
        psLine(501, 1, '/opt/homebrew/bin/tmux -L work attach-session -t build'),
        psLine(502, 1, '/opt/homebrew/bin/tmux new-session -s notes')
      ].join('\n')
    );
    assert.deepEqual(findOrphanedClients(rows.values(), server), []);
  });

  it('spares a NON-tmux process that merely mentions our socket', () => {
    const rows = parsePsTable(
      [
        psLine(600, 1, '/bin/zsh -c echo tmux -L gmux'),
        psLine(601, 1, '/usr/bin/grep -L gmux tmux'),
        // …and an editor with the flag in a file path it has open
        psLine(602, 1, '/usr/bin/vim /Users/x/notes/tmux -L gmux.md')
      ].join('\n')
    );
    assert.deepEqual(findOrphanedClients(rows.values(), server), []);
  });

  it('finds an orphaned ATTACH client too — same leak, same fix', () => {
    const rows = parsePsTable(
      psLine(7100, 1, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} attach-session -t =api-refactor`)
    );
    assert.deepEqual(findOrphanedClients(rows.values(), server), [7100]);
  });

  it('returns every orphan, sorted, from a realistic table', () => {
    const rows = parsePsTable(
      [
        psLine(server, 1, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} start-server`),
        psLine(72010, 1, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} -C new-session -A -s gmux-control`),
        psLine(6994, 1, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} -C new-session -A -s gmux-control`),
        psLine(67829, 67024, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} -C new-session -A -s gmux-control`),
        psLine(67024, 512, '/Users/x/gmux/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron .')
      ].join('\n')
    );
    assert.deepEqual(findOrphanedClients(rows.values(), server), [6994, 72010]);
  });

  // PHASE 23 FIX ROUND. The two conditions below are the ones that were
  // missing on 2026-08-12, when a harness running on its own socket reaped the
  // operator's real `-L gmux` server and destroyed 36 live sessions.
  //
  // The mechanism was that the socket came from a CONSTANT while the spared
  // server pid came from the socket the process was actually on. Set
  // GMUX_TMUX_SOCKET and the two disagree, and the real server matches every
  // condition the matcher had.

  it('never signals a tmux SERVER, even on another socket and even when it is not the spared pid', () => {
    const rows = parsePsTable(
      [
        // The operator's real server. ppid 1, our socket name in its command,
        // argv[0] is tmux, and NOT the pid we were told to spare, because we
        // asked a different socket for that.
        psLine(47416, 1, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} start-server`),
        // The harness's own server, which is the one we asked.
        psLine(server, 1, `/opt/homebrew/bin/tmux -L gmux-harness -f ${CONF} start-server`)
      ].join('\n')
    );
    assert.deepEqual(findOrphanedClients(rows.values(), server, 'gmux'), []);
    assert.deepEqual(findOrphanedClients(rows.values(), server, 'gmux-harness'), []);
  });

  it('matches the socket name WHOLE, so `gmux` never matches `gmux-harness`', () => {
    const rows = parsePsTable(
      [
        psLine(6994, 1, `/opt/homebrew/bin/tmux -L gmux -f ${CONF} -C new-session -A -s gmux-control`),
        psLine(6995, 1, `/opt/homebrew/bin/tmux -L gmux-harness -f ${CONF} -C new-session -A -s gmux-control`)
      ].join('\n')
    );
    assert.deepEqual(findOrphanedClients(rows.values(), server, 'gmux-harness'), [6995]);
    assert.deepEqual(findOrphanedClients(rows.values(), server, 'gmux'), [6994]);
  });
});

describe('findStrandedPathProbes', () => {
  // The exact shape seen on the reporting machine: a leader whose app is gone
  // (ppid 1) and the copy `zsh -lic` forked of itself, parented to the leader.
  const PROBE = `/bin/zsh -lic printf '__GMUX_PATH__%s__GMUX_PATH__' "$PATH"`;

  it('finds the leader AND the fork it left behind', () => {
    const rows = parsePsTable(
      [psLine(2395, 1, PROBE), psLine(3067, 2395, PROBE)].join('\n')
    );
    assert.deepEqual(findStrandedPathProbes(rows), [2395, 3067]);
  });

  it('spares a probe a LIVE gmux is waiting on, fork included', () => {
    const rows = parsePsTable(
      [
        psLine(67024, 512, '/…/MacOS/Electron .'),
        psLine(2395, 67024, PROBE), // running probe
        psLine(3067, 2395, PROBE) // its fork
      ].join('\n')
    );
    assert.deepEqual(findStrandedPathProbes(rows), []);
  });

  it('matches on the marker, not on being a shell', () => {
    const rows = parsePsTable(
      [
        psLine(500, 1, '/bin/zsh -lic printf "hello"'),
        psLine(501, 1, '/bin/zsh -l'),
        psLine(502, 1, '/bin/bash --login')
      ].join('\n')
    );
    assert.deepEqual(findStrandedPathProbes(rows), []);
  });
});

// ---------------------------------------------------------------------------
// Phase 167: the reap must END a probe, not log that it did.
//
// From 13.8 to 0.85.3 the probe reap sent SIGTERM per pid and wrote `killed N`
// to the log. An interactive zsh ignores SIGTERM by design, and every probe
// is one. Measured 2026-08-29 with pairs planted at ppid 1 carrying the real
// marker: after a launch that logged `killed 5`, three of the five were alive,
// being a pair whose fork ignored SIGTERM and a leader with no fork at all,
// waiting on a foreground sleep. The two tests below fail on that tree.
// ---------------------------------------------------------------------------

describe('endStrandedPathProbes, the signal plan', () => {
  it('sends SIGKILL to the group and then to the pid, for every pid', () => {
    const sent: Array<[number, NodeJS.Signals]> = [];
    const signalled = endStrandedPathProbes([2395, 3067], (pid, signal) => {
      sent.push([pid, signal]);
    });
    assert.deepEqual(sent, [
      [-2395, 'SIGKILL'],
      [2395, 'SIGKILL'],
      [-3067, 'SIGKILL'],
      [3067, 'SIGKILL']
    ]);
    assert.deepEqual(signalled, [2395, 3067]);
  });

  it('a fork that leads no group is still reached by pid, and a pid already gone is not counted', () => {
    const signalled = endStrandedPathProbes([2395, 3067, 4000], (pid) => {
      // 2395 leads its group; 3067 is a fork inside it (ESRCH on -3067);
      // 4000 exited between ps and now (ESRCH on both).
      if (pid === -3067 || pid === 4000 || pid === -4000) {
        throw Object.assign(new Error('kill ESRCH'), { code: 'ESRCH' });
      }
    });
    assert.deepEqual(signalled, [2395, 3067]);
  });

  it('never sends anything but SIGKILL', () => {
    const signals = new Set<string>();
    endStrandedPathProbes([10, 20], (_pid, signal) => {
      signals.add(signal);
    });
    assert.deepEqual([...signals], ['SIGKILL']);
  });
});

describe('reapOrphanedTmuxClients, a stranded probe that ignores SIGTERM (Phase 167)', () => {
  const PROBE = `/bin/zsh -lic printf '__GMUX_PATH__%s__GMUX_PATH__' "$PATH"`;
  let child: ChildProcess | null = null;

  afterEach(() => {
    psTable.rows = new Map();
    if (child !== null && child.exitCode === null && child.signalCode === null && child.pid) {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        /* already gone */
      }
    }
    child = null;
  });

  it('is dead after one reap, and the result says it was signalled', async () => {
    // The shape of every probe: its own process group, and SIGTERM ignored.
    child = spawn('/bin/sh', ['-c', 'trap "" TERM; sleep 30'], {
      detached: true,
      stdio: 'ignore'
    });
    const pid = child.pid;
    assert.ok(pid !== undefined, 'the stand in did not spawn');
    const exited = new Promise<'dead'>((r) => child?.once('exit', () => r('dead')));
    await sleep(200); // let the shell install its trap before anything is sent

    // The table the reap reads: our stand in, at ppid 1, wearing the marker.
    psTable.rows = parsePsTable(psLine(pid, 1, PROBE));

    const result = await reapOrphanedTmuxClients();
    assert.deepEqual(result.probes, [pid]);
    assert.deepEqual(result.found, []);
    assert.ok(result.signalled.includes(pid), 'the probe was not signalled');
    assert.ok(result.skipped !== undefined, 'no server means clients are skipped, probes are not');

    const outcome = await Promise.race([exited, sleep(1_500).then(() => 'alive' as const)]);
    assert.equal(outcome, 'dead', `pid ${String(pid)} survived the boot reap`);
  });
});
