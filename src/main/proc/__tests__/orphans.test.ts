/**
 * Unit tests for src/main/proc/ps.ts and the orphan matcher in
 * src/main/proc/orphans.ts (Phase 13.8).
 *
 * Both matchers signal real processes in production, so the safety conditions
 * are tested one refusal at a time: not ours, not orphaned, not tmux, never
 * the server — and, for the stranded PATH probes, never one a live gmux is
 * still waiting on.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { childIndex, descendantsOf, parsePsTable } from '../ps';
import { findOrphanedClients, findStrandedPathProbes } from '../orphans';

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
