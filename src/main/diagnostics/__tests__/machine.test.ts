/**
 * Unit tests for src/main/diagnostics/machine.ts (Phase 168).
 *
 * The claims that matter: an app's helpers fold into the app by its first
 * `.app` bundle, a pid Tortie owns never enters another group, the rank
 * counts every group above Tortie while the face list is capped, and an
 * empty table answers null rather than a wrong sentence.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import type { ProcRow } from '../../proc/ps';
import { appNameOf, buildMachineContext } from '../machine';

const MB = 1024;

function row(pid: number, rssKb: number, command: string): ProcRow {
  return { pid, ppid: 1, rssKb, cpuPercent: 0, command };
}

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const CHROME_GPU =
  '/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/1/Helpers/Google Chrome Helper (GPU).app/Contents/MacOS/Google Chrome Helper (GPU) --type=gpu-process';

describe('appNameOf', () => {
  it('names a process by its first app bundle, so helpers fold in', () => {
    assert.equal(appNameOf(CHROME), 'Google Chrome');
    assert.equal(appNameOf(CHROME_GPU), 'Google Chrome');
  });

  it('falls back to the binary basename outside a bundle', () => {
    assert.equal(appNameOf('/opt/homebrew/bin/node server.js'), 'node');
    assert.equal(appNameOf(''), 'unknown');
  });
});

describe('buildMachineContext', () => {
  const rows = [
    row(10, 2000 * MB, CHROME),
    row(11, 1500 * MB, CHROME_GPU),
    row(20, 900 * MB, '/Applications/OrbStack.app/Contents/MacOS/OrbStack'),
    row(30, 100 * MB, '/opt/homebrew/bin/node server.js'),
    row(40, 600 * MB, '/usr/local/bin/claude'),
    row(50, 50 * MB, '/bin/zsh -l')
  ];

  it('groups helpers into their app and ranks Tortie by resident memory', () => {
    const m = buildMachineContext({
      rows,
      ownedPids: new Set<number>(),
      tortieRssBytes: 700 * MB * 1024
    });
    assert.ok(m !== null);
    // Chrome 3500, OrbStack 900 sit above 700; claude 600, node 100, zsh 50 below.
    assert.equal(m.rank, 3);
    assert.equal(m.appCount, 6);
    assert.deepEqual(
      m.above.map((a) => a.name),
      ['Google Chrome', 'OrbStack']
    );
    assert.equal(m.above[0]?.rssBytes, 3500 * MB * 1024);
  });

  it('never lets a pid Tortie owns rank against it as a stranger', () => {
    const m = buildMachineContext({
      rows,
      // The claude agent and the shell are Tortie's own sessions.
      ownedPids: new Set([40, 50]),
      tortieRssBytes: 700 * MB * 1024
    });
    assert.ok(m !== null);
    assert.equal(m.appCount, 4);
    assert.equal(
      m.above.some((a) => a.name === 'claude'),
      false
    );
  });

  it('caps the face list while the rank still counts every group above', () => {
    const many = [
      ...rows,
      row(60, 5000 * MB, '/Applications/Xcode.app/Contents/MacOS/Xcode'),
      row(61, 4000 * MB, '/Applications/Figma.app/Contents/MacOS/Figma'),
      row(62, 3600 * MB, '/Applications/Slack.app/Contents/MacOS/Slack')
    ];
    const m = buildMachineContext({
      rows: many,
      ownedPids: new Set<number>(),
      tortieRssBytes: 700 * MB * 1024
    });
    assert.ok(m !== null);
    assert.equal(m.rank, 6);
    assert.equal(m.above.length, 3);
    assert.deepEqual(
      m.above.map((a) => a.name),
      ['Xcode', 'Figma', 'Slack']
    );
  });

  it('answers null over an empty table rather than a wrong sentence', () => {
    assert.equal(
      buildMachineContext({ rows: [], ownedPids: new Set<number>(), tortieRssBytes: 1 }),
      null
    );
  });

  it('carries a name, never a path', () => {
    const m = buildMachineContext({
      rows,
      ownedPids: new Set<number>(),
      tortieRssBytes: 1
    });
    assert.ok(m !== null);
    for (const a of m.above) assert.equal(a.name.includes('/'), false);
  });
});
