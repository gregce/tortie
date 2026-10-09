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
  decideRemotePair,
  decideRemoteVersionGate,
  assertServerVersionUsable,
  composeVersionRemedy,
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

/**
 * PHASE 217. The refusal has to say what to do about itself, and every word of
 * that is composed from a real read.
 *
 * The guard is NOT what changed. `TESTED_TMUX_PAIRS` gains no row here, the
 * same pairs are refused, and nothing on the screen attaches anyway. What
 * changed is that the screen used to name two version numbers and stop, with a
 * fixed command naming socket gmux whatever socket was in use.
 */
describe('composeVersionRemedy', () => {
  const installed = {
    pid: 953,
    binary: '/Applications/Tortie.app/Contents/Resources/bin/tmux',
    appBundle: '/Applications/Tortie.app'
  };

  it('names the application that started the server', () => {
    const remedy = composeVersionRemedy({
      socket: 'gmux',
      packaged: true,
      origin: installed
    });
    assert.equal(
      remedy.lines[0],
      'That server was started by Tortie at /Applications/Tortie.app.'
    );
  });

  it('names a plain binary when the server is not inside an application', () => {
    const remedy = composeVersionRemedy({
      socket: 'gmux',
      packaged: true,
      origin: { pid: 12, binary: '/opt/homebrew/bin/tmux', appBundle: null }
    });
    assert.deepEqual(remedy.lines, [
      'That server was started by /opt/homebrew/bin/tmux.'
    ]);
  });

  it('says nothing about a server it could not identify', () => {
    // A remedy that names the wrong file is worse than no remedy, so a failed
    // read costs a line rather than inventing one.
    const remedy = composeVersionRemedy({
      socket: 'gmux',
      packaged: true,
      origin: { pid: null, binary: null, appBundle: null }
    });
    assert.deepEqual(remedy.lines, []);
  });

  it('offers the second way forward to a development build only', () => {
    const dev = composeVersionRemedy({
      socket: 'gmux',
      packaged: false,
      origin: installed
    });
    assert.equal(dev.lines.length, 2);
    assert.equal(
      dev.lines[1],
      'This development build can run that same tmux with GMUX_TMUX_BIN.'
    );
    // A packaged Tortie refuses the override, so telling anybody to set it
    // would be an instruction that does nothing.
    const packaged = composeVersionRemedy({
      socket: 'gmux',
      packaged: true,
      origin: installed
    });
    assert.equal(packaged.lines.length, 1);
  });

  it('does not offer it when there is no binary to point at', () => {
    const remedy = composeVersionRemedy({
      socket: 'gmux',
      packaged: false,
      origin: { pid: 7, binary: null, appBundle: null }
    });
    assert.deepEqual(remedy.lines, []);
  });

  it('the command names the socket actually in use', () => {
    // In the product this is byte identical to the string the screen shipped
    // with. Under a harness socket the old fixed string sent a person at the
    // server holding their real work.
    assert.equal(
      composeVersionRemedy({
        socket: 'gmux',
        packaged: true,
        origin: installed
      }).command,
      'tmux -L gmux kill-server'
    );
    assert.equal(
      composeVersionRemedy({
        socket: 'gmux-p217-app',
        packaged: false,
        origin: installed
      }).command,
      'tmux -L gmux-p217-app kill-server'
    );
  });

  it('keeps the house writing rules on every line it composes', () => {
    for (const packaged of [true, false]) {
      for (const origin of [
        installed,
        { pid: 12, binary: '/opt/homebrew/bin/tmux', appBundle: null },
        { pid: null, binary: null, appBundle: null }
      ]) {
        const remedy = composeVersionRemedy({ socket: 'gmux', packaged, origin });
        // Just enough words. At most two lines, each one sentence.
        assert.ok(remedy.lines.length <= 2);
        for (const line of remedy.lines) {
          assert.ok(!line.includes('—'), line);
          assert.ok(!line.includes('–'), line);
          assert.ok(!line.includes(':'), line);
          assert.ok(line.endsWith('.'), line);
        }
      }
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
    // PHASE 217. The refusal carries the way out with it, and the command is
    // composed against the socket that was refused rather than a fixed one.
    assert.equal(payload.remedy?.command, 'tmux -L gmux-p41-unit kill-server');
  });

  it('a server it cannot identify still gets a command on the right socket', async () => {
    // The fake door answers the VERSION to every display-message, so the pid
    // read gets "3.5a" and is refused as not a pid. That is the shape of a
    // machine whose process could not be read, and the remedy says nothing
    // about who started the server rather than guessing.
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
    assert.ok(thrown instanceof GmuxError);
    const remedy = (thrown as GmuxError).payload.remedy;
    assert.deepEqual(remedy?.lines, []);
    assert.equal(remedy?.command, 'tmux -L gmux-p41-unit kill-server');
  });

  it('the refusal carries who started the server, read through the gate', async () => {
    // PHASE 217, committer's round. The two lines this phase put on the screen
    // were reachable only by `npm run probe:p217`, which is in no gate: with
    // the origin read unwired from the gate the whole battery stayed green.
    // This case drives the SHIPPING gate with a door that answers the pid the
    // way tmux does and a process table that answers the installed app, which
    // is the operator's own machine on 2026-09-06, and reads the words off the
    // thrown payload rather than off the composer.
    const door: TmuxExec = (args) => {
      if (args[0] === 'display-message' && args[2] === '#{pid}') {
        return Promise.resolve('953\n');
      }
      if (args[0] === 'display-message') return Promise.resolve('3.5a\n');
      return Promise.resolve('');
    };
    let thrown: unknown = null;
    try {
      await assertServerVersionUsable({
        exec: door,
        bin: clientBin,
        socket: 'gmux-p41-unit',
        // Packaged, because a development build's client version is read by
        // running `bin -V` and this case has no tmux to point that at. The
        // second line, which only a development build gets, is pinned on the
        // composer above.
        packaged: true,
        ps: (pid) =>
          Promise.resolve(
            pid === 953
              ? '/Applications/Tortie.app/Contents/Resources/bin/tmux'
              : null
          )
      });
    } catch (err) {
      thrown = err;
    }
    assert.ok(thrown instanceof GmuxError);
    const remedy = (thrown as GmuxError).payload.remedy;
    assert.deepEqual(remedy?.lines, [
      'That server was started by Tortie at /Applications/Tortie.app.'
    ]);
    assert.equal(remedy?.command, 'tmux -L gmux-p41-unit kill-server');
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
    assert.deepEqual([...gate.supported], ['3.2a', '3.3a', '3.4', '3.5a', '3.6', '3.6a', '3.6b', '3.7b', '3.7c']);
  });

  it('holds the five versions the probes measured on the live connection', () => {
    // THE GATE AND THE MEASUREMENT ARE ONE FACT. If a row loses its control
    // measurement this fails. docs/research/52-control-mode-dialect.md is the
    // evidence for 3.6a and 3.7b, the 3.7c row's note is the evidence for
    // 3.7c, and `npm run probe:p324` is the evidence for 3.6 and 3.6b.
    const measured = TESTED_REMOTE_TMUX_VERSIONS.filter(
      (row) => row.measured.control
    ).map((row) => row.version);
    assert.deepEqual(measured, ['3.2a', '3.3a', '3.4', '3.5a', '3.6', '3.6a', '3.6b', '3.7b', '3.7c']);
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

  it('holds the five versions the probes measured on the exec plane', () => {
    // THE GATE AND THE MEASUREMENT ARE ONE FACT, the same way the control gate
    // holds its own. build/probe-execplane.mjs is the evidence for 3.6a, 3.7b
    // and 3.7c, and `npm run probe:p324` is the evidence for 3.6 and 3.6b.
    const measured = TESTED_REMOTE_TMUX_VERSIONS.filter(
      (row) => row.measured.exec
    ).map((row) => row.version);
    assert.deepEqual(measured, ['3.2a', '3.3a', '3.4', '3.5a', '3.6', '3.6a', '3.6b', '3.7b', '3.7c']);
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

// ---------------------------------------------------------------------------
// The 3.6 family rows (Phase 324)
// ---------------------------------------------------------------------------

describe('the 3.6 family rows (Phase 324)', () => {
  it('admits 3.6 and 3.6b on both gates', () => {
    // Measured by `npm run probe:p324` (docs/research/131-tmux-on-linux.md
    // section 7), and the rows carry plain subjects.
    for (const version of ['3.6', '3.6b']) {
      assert.deepEqual(decideRemoteVersionGate(version), { kind: 'measured', version });
      assert.deepEqual(decideRemoteControlGate(version), { kind: 'measured', version });
    }
  });

  it('admits nothing near them: the gates compare whole strings', () => {
    // No version arithmetic, no trim, no case folding, and no row for a
    // version nobody measured. PHASE 342 (build/p342/SPEC.md D1) measured 3.2a,
    // 3.3a, 3.4 and 3.5a on the packages, so those four are rows now and
    // their neighbours take their place here.
    for (const version of [
      '3.6 ',
      '3.6\r',
      '3.6c',
      '3.60',
      '3.6-rc',
      'next-3.6',
      '3.6A',
      '3.5a ',
      '3.5',
      '3.4a',
      '3.3',
      '3.2',
      '3.2A',
      '3.1c',
      '3.0a',
      '3.7',
      '3.7a',
      '3.8-rc'
    ]) {
      assert.equal(
        decideRemoteVersionGate(version).kind,
        'unmeasured',
        `the exec gate admitted ${JSON.stringify(version)}`
      );
      assert.equal(
        decideRemoteControlGate(version).kind,
        'unmeasured',
        `the control gate admitted ${JSON.stringify(version)}`
      );
    }
  });

  it('admits nothing near them through the parser the product runs first', () => {
    // The gates compare what parseTmuxVersion returns, so the parser is half of
    // the admission. Each of these is a string a far machine's tmux could print,
    // package version suffixes among them, and none may reach either gate as
    // 3.6 or 3.6b. (Phase 324's fix round: a parser that kept a leading
    // version-shaped token admitted four of them with every other test green.)
    // ('3.6 ' and '3.6\r' are not here: the parser has always trimmed the
    // line, so they read 3.6, exactly as '3.6a ' reads 3.6a at the parent.)
    for (const printed of [
      '3.6c',
      '3.60',
      '3.6.0',
      '3.6-rc',
      'tmux 3.6-rc',
      '3.6 foo',
      '3.6b foo',
      '3.6b+deb',
      '3.6b-1~bpo13+1',
      '3.6a-2ubuntu0.1',
      '3.6b.1',
      '3.6bb',
      '3.6A',
      'next-3.6',
      'v3.6'
    ]) {
      const version = parseTmuxVersion(printed);
      assert.ok(
        version !== '3.6' && version !== '3.6b',
        `${JSON.stringify(printed)} parsed as ${JSON.stringify(version)}`
      );
      assert.notEqual(
        decideRemoteVersionGate(version).kind,
        'measured',
        `the exec gate admitted ${JSON.stringify(printed)} as ${JSON.stringify(version)}`
      );
      assert.notEqual(
        decideRemoteControlGate(version).kind,
        'measured',
        `the control gate admitted ${JSON.stringify(printed)} as ${JSON.stringify(version)}`
      );
    }
  });

  it('reads both strings out of what the far tmux prints', () => {
    // The parser trims (it always has), so the gate's byte comparison is over
    // what the parser returns, never over the raw line.
    assert.equal(parseTmuxVersion('tmux 3.6\n'), '3.6');
    assert.equal(parseTmuxVersion('3.6b'), '3.6b');
  });

  it('leaves the 3.6a row as it was', () => {
    const row = TESTED_REMOTE_TMUX_VERSIONS.find((one) => one.version === '3.6a');
    assert.ok(row !== undefined, '3.6a is not in the list');
    assert.equal(row.subject, 'the copy of tmux already on this Mac');
    assert.equal(row.measuredAt, '2026-08-17');
  });
});

// PHASE 342 (build/p342/SPEC.md D1, D2, D7, D13, D14, D25). The four rows
// before the 3.6 wire change, what each carries, and the pure pair gate.
describe('the four rows before 3.6 and the pair (Phase 342)', () => {
  const OLDER = ['3.2a', '3.3a', '3.4', '3.5a'] as const;

  it('lists them oldest first, before 3.6, each measured on both planes', () => {
    const versions = TESTED_REMOTE_TMUX_VERSIONS.map((row) => row.version);
    assert.deepEqual(versions.slice(0, 4), [...OLDER]);
    assert.equal(versions[4], '3.6');
    for (const version of OLDER) {
      const row = TESTED_REMOTE_TMUX_VERSIONS.find((one) => one.version === version);
      assert.ok(row !== undefined, `${version} is not in the list`);
      assert.deepEqual(row.measured, { exec: true, control: true });
      assert.equal(row.measuredAt, '2026-10-07');
    }
  });

  it('carries programs only before 3.6, each list its own version first and every member on the table', () => {
    const table = new Set(TESTED_REMOTE_TMUX_VERSIONS.map((row) => row.version));
    for (const row of TESTED_REMOTE_TMUX_VERSIONS) {
      if ((OLDER as readonly string[]).includes(row.version)) {
        assert.ok(row.programs !== undefined, `${row.version} carries no programs`);
        assert.equal(row.programs[0], row.version);
        for (const program of row.programs) assert.ok(table.has(program), program);
      } else {
        assert.equal(row.programs, undefined, `${row.version} carries programs`);
        assert.equal(row.lacks, undefined, `${row.version} carries lacks`);
        assert.equal(row.quirks, undefined, `${row.version} carries quirks`);
      }
    }
    const programs = Object.fromEntries(
      TESTED_REMOTE_TMUX_VERSIONS.filter((row) => row.programs).map((row) => [row.version, row.programs])
    );
    assert.deepEqual(programs, {
      '3.2a': ['3.2a'],
      '3.3a': ['3.3a', '3.5a'],
      '3.4': ['3.4'],
      '3.5a': ['3.5a']
    });
  });

  it('declares what each refuses and how it answers, exactly as measured', () => {
    const by = (version: string) => TESTED_REMOTE_TMUX_VERSIONS.find((row) => row.version === version);
    assert.deepEqual(by('3.2a')?.lacks, ['allow-passthrough', 'copy-mode-position-format', 'mode-style']);
    for (const version of ['3.3a', '3.4', '3.5a']) {
      assert.deepEqual(by(version)?.lacks, ['copy-mode-position-format', 'mode-style'], version);
    }
    assert.deepEqual(by('3.2a')?.quirks, { joinedCapturePads: true });
    assert.equal(by('3.3a')?.quirks, undefined);
    assert.deepEqual(by('3.4')?.quirks, { dollarOnRead: true });
    assert.equal(by('3.5a')?.quirks, undefined);
  });

  it('decides the pair purely: server-only from 3.6, measured on the list, refused otherwise', () => {
    const versions = TESTED_REMOTE_TMUX_VERSIONS.map((row) => row.version);
    for (const row of TESTED_REMOTE_TMUX_VERSIONS) {
      for (const program of [...versions, null, '3.9z']) {
        const verdict = decideRemotePair(row.version, program);
        if (row.programs === undefined) {
          assert.deepEqual(verdict, { kind: 'server-only' }, `${row.version} under ${String(program)}`);
        } else if (program !== null && row.programs.includes(program)) {
          assert.deepEqual(verdict, { kind: 'measured' }, `${row.version} under ${program}`);
        } else {
          assert.deepEqual(
            verdict,
            { kind: 'refused', server: row.version, program },
            `${row.version} under ${String(program)}`
          );
        }
      }
    }
    // A version with no row at all is server-only: nothing here admits it,
    // and the version gate already refused it.
    assert.deepEqual(decideRemotePair('3.0a', '3.0a'), { kind: 'server-only' });
    // 3.2a under a 3.4 program is unmeasured on the packages, so refused.
    assert.deepEqual(decideRemotePair('3.2a', '3.4'), { kind: 'refused', server: '3.2a', program: '3.4' });
    assert.deepEqual(decideRemotePair('3.3a', '3.5a'), { kind: 'measured' });
    assert.deepEqual(decideRemotePair('3.5a', '3.6b'), { kind: 'refused', server: '3.5a', program: '3.6b' });
  });
});
