/**
 * Unit tests for src/main/tmux/version.ts (Phase 41).
 *
 * The gate decides whether Tortie attaches to a tmux server that was already
 * running, and the cost of getting it wrong is a freeze on live sessions. The
 * probes in the phase's verification plan drive real servers; these cover the
 * combinations a real server cannot cheaply produce, which is every one of
 * them:
 *
 * - `decideVersionGate` over server known or null, client known or null,
 *   packaged true or false, and pair in or out of the table.
 * - the two reads, including the fallback order and the empty answer.
 * - the throw, its code, its words, and what is remembered afterwards.
 *
 * Runner: vitest (`npm test`). Assertions on node:assert/strict.
 */

import { beforeEach, describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { GmuxError } from '../../errors';
import {
  BUNDLED_TMUX_VERSION,
  TESTED_REMOTE_TMUX_VERSIONS,
  TESTED_TMUX_PAIRS,
  decideRemoteControlGate,
  decideRemoteVersionGate,
  assertServerVersionUsable,
  decideVersionGate,
  lastVersionGate,
  parseTmuxVersion,
  readServerVersion,
  resetTmuxVersionState,
  versionBlockDetail,
  versionBlockMessage,
  type TmuxExec
} from '../version';

/** The one pair this release ships as tested, read from the table itself. */
const pair = TESTED_TMUX_PAIRS[0];
if (pair === undefined) throw new Error('TESTED_TMUX_PAIRS is empty');

beforeEach(() => {
  resetTmuxVersionState();
});

describe('the pin and the table agree with each other', () => {
  it('every tested pair names this release as the client', () => {
    assert.ok(TESTED_TMUX_PAIRS.length > 0);
    for (const p of TESTED_TMUX_PAIRS) {
      assert.equal(
        p.client,
        BUNDLED_TMUX_VERSION,
        `${p.server}/${p.client} describes a release that is not this one`
      );
    }
  });

  it('no pair claims the server and the client are the same version', () => {
    for (const p of TESTED_TMUX_PAIRS) {
      assert.notEqual(p.server, p.client);
    }
  });
});

describe('parseTmuxVersion', () => {
  it('reads the `-V` shape', () => {
    assert.equal(parseTmuxVersion('tmux 3.7b\n'), '3.7b');
    assert.equal(parseTmuxVersion('tmux next-3.8\n'), 'next-3.8');
  });

  it('reads the bare `#{version}` shape', () => {
    assert.equal(parseTmuxVersion('3.6a\n'), '3.6a');
    assert.equal(parseTmuxVersion('3.7b'), '3.7b');
  });

  it('answers null for anything that is not a version', () => {
    assert.equal(parseTmuxVersion(''), null);
    assert.equal(parseTmuxVersion('\n'), null);
    assert.equal(parseTmuxVersion('no server running on /tmp/x'), null);
  });

  it('takes the first line only, so a chatty answer cannot smuggle a second', () => {
    assert.equal(parseTmuxVersion('3.7b\n3.5a\n'), '3.7b');
  });
});

describe('readServerVersion — two reads, in the order the measurement asked for', () => {
  /** Record what was asked, and answer from a script. */
  function scripted(answers: Record<string, string | Error>): {
    exec: TmuxExec;
    calls: string[];
  } {
    const calls: string[] = [];
    const exec: TmuxExec = (args) => {
      const key = args.join(' ');
      calls.push(key);
      const answer = answers[key];
      if (answer === undefined) return Promise.reject(new Error(`no script for ${key}`));
      if (answer instanceof Error) return Promise.reject(answer);
      return Promise.resolve(answer);
    };
    return { exec, calls };
  }

  const DISPLAY = "display-message -p #{version}";
  const LIST = "list-sessions -F #{version}";

  it('asks display-message first and stops there when it answers', async () => {
    const { exec, calls } = scripted({ [DISPLAY]: '3.6a\n' });
    assert.equal(await readServerVersion(exec), '3.6a');
    assert.deepEqual(calls, [DISPLAY]);
  });

  it('falls back to list-sessions when display-message answers nothing', async () => {
    const { exec, calls } = scripted({ [DISPLAY]: '\n', [LIST]: '3.7b\n' });
    assert.equal(await readServerVersion(exec), '3.7b');
    assert.deepEqual(calls, [DISPLAY, LIST]);
  });

  it('falls back when display-message throws', async () => {
    const { exec } = scripted({
      [DISPLAY]: new Error('timed out'),
      [LIST]: '3.7b\n'
    });
    assert.equal(await readServerVersion(exec), '3.7b');
  });

  /**
   * The measured case that decides the design. On a warm server holding zero
   * sessions, `display-message` prints the version and `list-sessions -F`
   * prints nothing, so the fallback is the one that cannot answer there.
   */
  it('answers from display-message alone when there are no sessions', async () => {
    const { exec, calls } = scripted({ [DISPLAY]: '3.7b\n', [LIST]: '' });
    assert.equal(await readServerVersion(exec), '3.7b');
    assert.deepEqual(calls, [DISPLAY]);
  });

  it('answers null when neither read produces a version', async () => {
    const { exec, calls } = scripted({ [DISPLAY]: '', [LIST]: '' });
    assert.equal(await readServerVersion(exec), null);
    assert.deepEqual(calls, [DISPLAY, LIST]);
  });
});

describe('decideVersionGate — every combination', () => {
  it('equal versions are silent, packaged or not', () => {
    assert.deepEqual(
      decideVersionGate({ server: '3.7b', client: '3.7b', packaged: true }),
      { kind: 'same' }
    );
    assert.deepEqual(
      decideVersionGate({ server: '3.7b', client: '3.7b', packaged: false }),
      { kind: 'same' }
    );
  });

  it('the tested pair passes, and it passes in ONE direction only', () => {
    assert.deepEqual(
      decideVersionGate({
        server: pair.server,
        client: pair.client,
        packaged: true
      }),
      { kind: 'tested-pair', server: pair.server, client: pair.client }
    );
    // Swap the two and it is a different case, because the pair is ordered.
    assert.deepEqual(
      decideVersionGate({
        server: pair.client,
        client: pair.server,
        packaged: true
      }),
      { kind: 'untested-pair', server: pair.client, client: pair.server }
    );
  });

  it('a pair nobody tested blocks', () => {
    assert.deepEqual(
      decideVersionGate({ server: '3.5a', client: '3.7b', packaged: true }),
      { kind: 'untested-pair', server: '3.5a', client: '3.7b' }
    );
  });

  it('a server that would not answer blocks, packaged or not', () => {
    assert.deepEqual(
      decideVersionGate({ server: null, client: '3.7b', packaged: true }),
      { kind: 'unreadable', server: null, client: '3.7b' }
    );
    assert.deepEqual(
      decideVersionGate({ server: null, client: '3.7b', packaged: false }),
      { kind: 'unreadable', server: null, client: '3.7b' }
    );
  });

  it('a packaged build with no `-V` answer falls back to what it shipped', () => {
    assert.deepEqual(
      decideVersionGate({
        server: BUNDLED_TMUX_VERSION,
        client: null,
        packaged: true
      }),
      { kind: 'same' }
    );
    assert.deepEqual(
      decideVersionGate({ server: pair.server, client: null, packaged: true }),
      { kind: 'tested-pair', server: pair.server, client: BUNDLED_TMUX_VERSION }
    );
    assert.deepEqual(
      decideVersionGate({ server: '2.9a', client: null, packaged: true }),
      { kind: 'untested-pair', server: '2.9a', client: BUNDLED_TMUX_VERSION }
    );
  });

  /**
   * The second asymmetry. A development build that could not read its own
   * client version has nothing to compare, so it is skipped rather than
   * blocked, and that stays true even when the server would not answer either.
   */
  it('a development build with no `-V` answer is skipped, never blocked', () => {
    assert.deepEqual(
      decideVersionGate({ server: '3.6a', client: null, packaged: false }),
      { kind: 'skip' }
    );
    assert.deepEqual(
      decideVersionGate({ server: null, client: null, packaged: false }),
      { kind: 'skip' }
    );
  });

  it('a packaged build with neither read still blocks, because the client is known', () => {
    assert.deepEqual(
      decideVersionGate({ server: null, client: null, packaged: true }),
      { kind: 'unreadable', server: null, client: BUNDLED_TMUX_VERSION }
    );
  });
});

describe('the words', () => {
  it('names both versions and says what will not happen', () => {
    const message = versionBlockMessage({
      kind: 'untested-pair',
      server: '3.5a',
      client: '3.7b'
    });
    assert.equal(
      message,
      'The session server on this machine is running tmux 3.5a. Tortie runs ' +
        'tmux 3.7b. Tortie has not tested that pair, so it will not attach to it.'
    );
  });

  it('says plainly when it could not read the server at all', () => {
    const message = versionBlockMessage({
      kind: 'unreadable',
      server: null,
      client: '3.7b'
    });
    assert.equal(
      message,
      'Tortie could not read the version of the session server that is ' +
        'already running. It will not attach to a server it cannot identify.'
    );
  });

  it('the detail line is technical and carries the socket and the binary', () => {
    assert.equal(
      versionBlockDetail(
        { kind: 'untested-pair', server: '3.5a', client: '3.7b' },
        'gmux',
        '/x/tmux'
      ),
      'server 3.5a, client 3.7b, socket gmux, client at /x/tmux'
    );
    assert.equal(
      versionBlockDetail(
        { kind: 'unreadable', server: null, client: '3.7b' },
        'gmux',
        '/x/tmux'
      ),
      'server unreadable, client 3.7b, socket gmux, client at /x/tmux'
    );
  });

  it('no user facing sentence uses a dash where a full stop belongs', () => {
    const sentences = [
      versionBlockMessage({ kind: 'untested-pair', server: '3.5a', client: '3.7b' }),
      versionBlockMessage({ kind: 'unreadable', server: null, client: '3.7b' })
    ];
    for (const line of sentences) {
      assert.ok(!line.includes('—'), line);
      assert.ok(!line.includes('–'), line);
    }
  });
});

describe('assertServerVersionUsable', () => {
  /** A server that answers one version, and a client binary that answers another. */
  function exec(version: string | null): TmuxExec {
    return (args) => {
      if (args[0] === 'display-message') {
        return version === null
          ? Promise.reject(new Error('no answer'))
          : Promise.resolve(`${version}\n`);
      }
      return Promise.resolve('');
    };
  }

  /** `/bin/echo tmux 3.7b` is not portable; use the repo's own node instead. */
  const clientBin = process.execPath;

  it('throws TMUX_VERSION_UNTESTED, with both numbers in the message', async () => {
    let thrown: unknown = null;
    try {
      await assertServerVersionUsable({
        exec: exec('3.5a'),
        bin: clientBin,
        socket: 'gmux-p41-unit',
        packaged: true
      });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown instanceof GmuxError, 'expected a structured error');
    const payload = (thrown as GmuxError).payload;
    assert.equal(payload.code, 'TMUX_VERSION_UNTESTED');
    assert.match(payload.message, /running tmux 3\.5a/);
    assert.match(payload.message, /Tortie runs tmux 3\.7b/);
    assert.match(payload.detail ?? '', /socket gmux-p41-unit/);
  });

  it('does NOT remember a block, so Check again re-probes', async () => {
    await assert.rejects(() =>
      assertServerVersionUsable({
        exec: exec('3.5a'),
        bin: clientBin,
        socket: 'gmux-p41-unit',
        packaged: true
      })
    );
    assert.equal(lastVersionGate(), null);
    // The user ended the old server; the next probe meets the new one.
    const gate = await assertServerVersionUsable({
      exec: exec(BUNDLED_TMUX_VERSION),
      bin: clientBin,
      socket: 'gmux-p41-unit',
      packaged: true
    });
    assert.deepEqual(gate, { kind: 'same' });
  });

  it('remembers a pass, so the reconnect loop does not probe again', async () => {
    let reads = 0;
    const counting: TmuxExec = (args) => {
      if (args[0] === 'display-message') {
        reads += 1;
        return Promise.resolve(`${BUNDLED_TMUX_VERSION}\n`);
      }
      return Promise.resolve('');
    };
    const input = {
      exec: counting,
      bin: clientBin,
      socket: 'gmux-p41-unit',
      packaged: true
    };
    await assertServerVersionUsable(input);
    await assertServerVersionUsable(input);
    await assertServerVersionUsable(input);
    assert.equal(reads, 1);
    assert.deepEqual(lastVersionGate(), { kind: 'same' });
  });

  it('a development build whose client will not answer is skipped, not blocked', async () => {
    const gate = await assertServerVersionUsable({
      exec: exec('3.6a'),
      // A path that is not an executable file, so `-V` cannot answer.
      bin: '/definitely/not/a/tmux/binary',
      socket: 'gmux-p41-unit',
      packaged: false
    });
    assert.deepEqual(gate, { kind: 'skip' });
  });

  it('a server that will not answer blocks a development build too', async () => {
    await assert.rejects(
      () =>
        assertServerVersionUsable({
          exec: exec(null),
          bin: clientBin,
          socket: 'gmux-p41-unit',
          packaged: true
        }),
      (err: unknown) =>
        err instanceof GmuxError &&
        err.payload.code === 'TMUX_VERSION_UNTESTED' &&
        err.payload.message.includes('cannot identify')
    );
  });
});

// ---------------------------------------------------------------------------
// The control gate (Phase 71, M4)
// ---------------------------------------------------------------------------

describe('decideRemoteControlGate', () => {
  it('reads a DIFFERENT column of the tested list from the exec gate', () => {
    // The two gates ask different questions of the same rows. A version measured
    // on one plane says nothing about the other, because control mode is a
    // different wire protocol from one-shot verbs.
    const list = [
      {
        version: '4.0',
        measured: { exec: true, control: false },
        measuredAt: '2026-08-17',
        subject: 'a made up copy, for this test only',
        note: 'the exec plane only'
      }
    ];
    assert.deepEqual(decideRemoteVersionGate('4.0', list), {
      kind: 'measured',
      version: '4.0'
    });
    assert.deepEqual(decideRemoteControlGate('4.0', list), {
      kind: 'unmeasured',
      version: '4.0',
      supported: []
    });
  });

  it('accepts a version measured on the control plane', () => {
    const list = [
      {
        version: '4.0',
        measured: { exec: true, control: true },
        measuredAt: '2026-08-17',
        subject: 'a made up copy, for this test only',
        note: 'both planes'
      }
    ];
    assert.deepEqual(decideRemoteControlGate('4.0', list), {
      kind: 'measured',
      version: '4.0'
    });
  });

  it('refuses a version it could not read, and names what it has measured', () => {
    const gate = decideRemoteControlGate(null);
    assert.equal(gate.kind, 'unreadable');
    assert.deepEqual([...gate.supported], ['3.6a', '3.7b', '3.7c']);
  });

  it('holds the two versions build/probe-control-dialect.mjs measured', () => {
    // THE GATE AND THE MEASUREMENT ARE ONE FACT. If a row loses its control
    // measurement this fails, and docs/research/52-control-mode-dialect.md is
    // the evidence for the two that have one.
    const measured = TESTED_REMOTE_TMUX_VERSIONS.filter(
      (row) => row.measured.control
    ).map((row) => row.version);
    assert.deepEqual(measured, ['3.6a', '3.7b', '3.7c']);
  });

  it('never measures control without measuring exec first', () => {
    // A version cannot be reachable on the live connection and unreachable for
    // the one-shot verbs, because the live connection's own precheck is a
    // one-shot verb.
    for (const row of TESTED_REMOTE_TMUX_VERSIONS) {
      if (row.measured.control) assert.equal(row.measured.exec, true);
    }
  });
});

// ---------------------------------------------------------------------------
// The exec gate and its fourth outcome (Phase 83)
// ---------------------------------------------------------------------------

describe('decideRemoteVersionGate', () => {
  /** One row, measured on the exec plane, so the list is a known quantity. */
  const list = [
    {
      version: '4.0',
      measured: { exec: true, control: true },
      measuredAt: '2026-08-18',
      subject: 'a made up copy, for this test only',
      note: 'both planes'
    }
  ];

  it('rule 1: a version nobody could read is unreadable, even with an acceptance', () => {
    // A version that could not be read is not a version an acceptance can bind
    // to, so the acceptance is ignored rather than honoured.
    assert.deepEqual(decideRemoteVersionGate(null, list, '4.1'), {
      kind: 'unreadable',
      supported: ['4.0']
    });
    assert.deepEqual(decideRemoteVersionGate(null, list, null), {
      kind: 'unreadable',
      supported: ['4.0']
    });
  });

  it('rule 2: a measured version is measured, and measured beats accepted', () => {
    assert.deepEqual(decideRemoteVersionGate('4.0', list), {
      kind: 'measured',
      version: '4.0'
    });
    // The person accepted the same version this build has since measured. The
    // measurement is the stronger fact, so the outcome stops being an
    // acceptance and the person is not carrying it any more.
    assert.deepEqual(decideRemoteVersionGate('4.0', list, '4.0'), {
      kind: 'measured',
      version: '4.0'
    });
  });

  it('rule 3: an acceptance byte equal to the reported version is accepted', () => {
    assert.deepEqual(decideRemoteVersionGate('4.1', list, '4.1'), {
      kind: 'accepted',
      version: '4.1'
    });
  });

  it('rule 4: everything else is unmeasured, and names what has been measured', () => {
    assert.deepEqual(decideRemoteVersionGate('4.1', list), {
      kind: 'unmeasured',
      version: '4.1',
      supported: ['4.0']
    });
    // An acceptance of a DIFFERENT version does not carry. This is the arm that
    // makes accepting 3.8a mean nothing once the machine reports 3.9a.
    assert.deepEqual(decideRemoteVersionGate('4.2', list, '4.1'), {
      kind: 'unmeasured',
      version: '4.2',
      supported: ['4.0']
    });
    // An empty acceptance is not an acceptance.
    assert.deepEqual(decideRemoteVersionGate('4.1', list, ''), {
      kind: 'unmeasured',
      version: '4.1',
      supported: ['4.0']
    });
    // A null acceptance is the ordinary case, and it is the same answer.
    assert.deepEqual(decideRemoteVersionGate('4.1', list, null), {
      kind: 'unmeasured',
      version: '4.1',
      supported: ['4.0']
    });
  });

  it('compares whole strings, never parts of them', () => {
    // There is no version arithmetic in this gate. "4" is not a prefix match
    // for "4.0", and "4.0a" is not near enough to "4.0".
    assert.equal(decideRemoteVersionGate('4', list).kind, 'unmeasured');
    assert.equal(decideRemoteVersionGate('4.0a', list).kind, 'unmeasured');
    assert.equal(decideRemoteVersionGate('4.1', list, '4.1 ').kind, 'unmeasured');
  });

  it('holds the three versions the probes measured on the exec plane', () => {
    // THE GATE AND THE MEASUREMENT ARE ONE FACT, the same way the control gate
    // holds its own. build/probe-execplane.mjs is the evidence for all three.
    const measured = TESTED_REMOTE_TMUX_VERSIONS.filter(
      (row) => row.measured.exec
    ).map((row) => row.version);
    assert.deepEqual(measured, ['3.6a', '3.7b', '3.7c']);
  });

  it('accepts 3.7c, which is what the Mac Pro reports, and still refuses a made up version', () => {
    assert.deepEqual(decideRemoteVersionGate('3.7c'), {
      kind: 'measured',
      version: '3.7c'
    });
    const refused = decideRemoteVersionGate('9.9z');
    assert.equal(refused.kind, 'unmeasured');
  });
});

describe('every tested remote row names the copy it read', () => {
  it('has a non-empty subject on every row', () => {
    // A row that does not say WHICH copy of a version it read is a row the next
    // reader cannot trust. Homebrew's build and an upstream tarball are two
    // different subjects, and only one of them was measured for each row.
    for (const row of TESTED_REMOTE_TMUX_VERSIONS) {
      assert.equal(typeof row.subject, 'string');
      assert.ok(
        row.subject.trim().length > 0,
        `${row.version} has no subject, so nobody knows which copy was measured`
      );
    }
  });

  it('says plainly that the 3.7c row is not Homebrew\'s build', () => {
    const row = TESTED_REMOTE_TMUX_VERSIONS.find((one) => one.version === '3.7c');
    assert.ok(row !== undefined, '3.7c is not in the list');
    assert.ok(row.subject.includes("not Homebrew's build"));
  });
});
